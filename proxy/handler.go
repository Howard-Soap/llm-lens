package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ProxyHandler 代理处理器
type ProxyHandler struct {
	storage    *Storage
	httpClient *http.Client
}

// NewProxyHandler 创建代理处理器
func NewProxyHandler(storage *Storage) *ProxyHandler {
	return &ProxyHandler{
		storage: storage,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// ChatCompletions 处理聊天完成请求
func (h *ProxyHandler) ChatCompletions(c *gin.Context) {
	startTime := time.Now()

	// 读取请求体
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}
	defer c.Request.Body.Close()

	// 解析请求
	var chatReq OpenAIChatRequest
	if err := json.Unmarshal(body, &chatReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// 获取 API Key
	apiKey := c.GetHeader("Authorization")
	if apiKey == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing API key"})
		return
	}

	// 脱敏记录日志
	maskedKey := maskAPIKey(apiKey)
	log.Printf("Chat request: model=%s, user=%s, key=%s", chatReq.Model, chatReq.User, maskedKey)

	// 确定目标 URL
	targetURL := "https://api.openai.com/v1/chat/completions"
	provider := GetModelProvider(chatReq.Model)

	// 创建请求
	req, err := http.NewRequest("POST", targetURL, bytes.NewReader(body))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	// 复制 Header
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", apiKey)
	if c.GetHeader("X-Request-Id") != "" {
		req.Header.Set("X-Request-Id", c.GetHeader("X-Request-Id"))
	}

	// 发送请求
	resp, err := h.httpClient.Do(req)
	if err != nil {
		// 记录错误
		h.recordError(c, chatReq, provider, startTime, err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to forward request"})
		return
	}
	defer resp.Body.Close()

	// 读取响应
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response"})
		return
	}

	// 计算延迟
	latencyMs := int(time.Since(startTime).Milliseconds())

	// 解析响应获取 token 用量
	var chatResp OpenAIChatResponse
	var inputTokens, outputTokens int
	if err := json.Unmarshal(respBody, &chatResp); err == nil {
		inputTokens = chatResp.Usage.PromptTokens
		outputTokens = chatResp.Usage.CompletionTokens
	}

	// 计算成本
	costUSD := CalculateCost(chatReq.Model, inputTokens, outputTokens)

	// 记录请求
	record := &RequestRecord{
		ID:           uuid.New().String(),
		Timestamp:    startTime,
		Model:        chatReq.Model,
		Provider:     provider,
		InputTokens:  inputTokens,
		OutputTokens: outputTokens,
		TotalTokens:  inputTokens + outputTokens,
		CostUSD:      costUSD,
		LatencyMs:    latencyMs,
		StatusCode:   resp.StatusCode,
		IsError:      resp.StatusCode >= 400,
		Stream:       chatReq.Stream,
		UserID:       chatReq.User,
		RequestBody:  maskSensitiveData(string(body)),
		ResponseBody: maskSensitiveData(string(respBody)),
	}

	if resp.StatusCode >= 400 {
		record.ErrorMessage = string(respBody)
	}

	// 异步记录到数据库
	go func() {
		if err := h.storage.InsertRequest(record); err != nil {
			log.Printf("Failed to record request: %v", err)
		}
	}()

	// 返回响应
	c.Data(resp.StatusCode, "application/json", respBody)
}

// Completions 处理补全请求
func (h *ProxyHandler) Completions(c *gin.Context) {
	// 类似 ChatCompletions 的实现
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

// Embeddings 处理嵌入请求
func (h *ProxyHandler) Embeddings(c *gin.Context) {
	startTime := time.Now()

	// 读取请求体
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}
	defer c.Request.Body.Close()

	// 解析请求
	var embedReq OpenAIEmbeddingRequest
	if err := json.Unmarshal(body, &embedReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// 获取 API Key
	apiKey := c.GetHeader("Authorization")
	if apiKey == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing API key"})
		return
	}

	// 脱敏记录日志
	maskedKey := maskAPIKey(apiKey)
	log.Printf("Embedding request: model=%s, key=%s", embedReq.Model, maskedKey)

	// 确定目标 URL
	targetURL := "https://api.openai.com/v1/embeddings"
	provider := GetModelProvider(embedReq.Model)

	// 创建请求
	req, err := http.NewRequest("POST", targetURL, bytes.NewReader(body))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	// 复制 Header
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", apiKey)

	// 发送请求
	resp, err := h.httpClient.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to forward request"})
		return
	}
	defer resp.Body.Close()

	// 读取响应
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response"})
		return
	}

	// 计算延迟
	latencyMs := int(time.Since(startTime).Milliseconds())

	// 解析响应获取 token 用量
	var embedResp OpenAIEmbeddingResponse
	var inputTokens int
	if err := json.Unmarshal(respBody, &embedResp); err == nil {
		inputTokens = embedResp.Usage.PromptTokens
	}

	// 计算成本
	costUSD := CalculateCost(embedReq.Model, inputTokens, 0)

	// 记录请求
	record := &RequestRecord{
		ID:          uuid.New().String(),
		Timestamp:   startTime,
		Model:       embedReq.Model,
		Provider:    provider,
		InputTokens: inputTokens,
		TotalTokens: inputTokens,
		CostUSD:     costUSD,
		LatencyMs:   latencyMs,
		StatusCode:  resp.StatusCode,
		IsError:     resp.StatusCode >= 400,
		UserID:      embedReq.User,
		RequestBody: maskSensitiveData(string(body)),
	}

	// 异步记录到数据库
	go func() {
		if err := h.storage.InsertRequest(record); err != nil {
			log.Printf("Failed to record request: %v", err)
		}
	}()

	// 返回响应
	c.Data(resp.StatusCode, "application/json", respBody)
}

// ImageGenerations 处理图像生成请求
func (h *ProxyHandler) ImageGenerations(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

// GetOverview 获取总览数据
func (h *ProxyHandler) GetOverview(c *gin.Context) {
	overview, err := h.storage.GetOverview()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, overview)
}

// GetRequests 获取请求列表
func (h *ProxyHandler) GetRequests(c *gin.Context) {
	// 解析查询参数
	limit := 50
	offset := 0
	model := c.Query("model")
	userID := c.Query("user_id")

	fmt.Sscanf(c.DefaultQuery("limit", "50"), "%d", &limit)
	fmt.Sscanf(c.DefaultQuery("offset", "0"), "%d", &offset)

	var isError *bool
	if c.Query("is_error") == "true" {
		t := true
		isError = &t
	} else if c.Query("is_error") == "false" {
		f := false
		isError = &f
	}

	// 查询数据
	requests, total, err := h.storage.GetRequests(limit, offset, model, userID, isError)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":   requests,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GetRequestByID 获取请求详情
func (h *ProxyHandler) GetRequestByID(c *gin.Context) {
	id := c.Param("id")
	request, err := h.storage.GetRequestByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}
	c.JSON(http.StatusOK, request)
}

// GetCosts 获取成本分析
func (h *ProxyHandler) GetCosts(c *gin.Context) {
	costs, err := h.storage.GetCosts()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, costs)
}

// GetPerformance 获取性能分析
func (h *ProxyHandler) GetPerformance(c *gin.Context) {
	performance, err := h.storage.GetPerformance()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, performance)
}

// GetSettings 获取设置
func (h *ProxyHandler) GetSettings(c *gin.Context) {
	settings, err := h.storage.GetSettings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, settings)
}

// UpdateSettings 更新设置
func (h *ProxyHandler) UpdateSettings(c *gin.Context) {
	var settings Settings
	if err := c.ShouldBindJSON(&settings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.storage.UpdateSettings(&settings); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// recordError 记录错误
func (h *ProxyHandler) recordError(c *gin.Context, chatReq OpenAIChatRequest, provider string, startTime time.Time, err error) {
	record := &RequestRecord{
		ID:           uuid.New().String(),
		Timestamp:    startTime,
		Model:        chatReq.Model,
		Provider:     provider,
		StatusCode:   http.StatusBadGateway,
		IsError:      true,
		ErrorMessage: err.Error(),
		Stream:       chatReq.Stream,
		UserID:       chatReq.User,
		LatencyMs:    int(time.Since(startTime).Milliseconds()),
	}

	go func() {
		if err := h.storage.InsertRequest(record); err != nil {
			log.Printf("Failed to record error: %v", err)
		}
	}()
}

// maskAPIKey 脱敏 API Key
func maskAPIKey(key string) string {
	// 移除 Bearer 前缀
	key = strings.TrimPrefix(key, "Bearer ")
	if len(key) < 8 {
		return "***"
	}
	return key[:3] + "..." + key[len(key)-4:]
}

// maskSensitiveData 脱敏敏感数据
func maskSensitiveData(data string) string {
	// 简单实现：移除 API Key
	data = strings.ReplaceAll(data, "sk-", "***")
	return data
}
