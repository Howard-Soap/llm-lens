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

// LLMProvider LLM 提供商
type LLMProvider string

const (
	ProviderOpenAI   LLMProvider = "openai"
	ProviderClaude   LLMProvider = "anthropic"
	ProviderDeepSeek LLMProvider = "deepseek"
	ProviderOllama   LLMProvider = "ollama"
	ProviderCustom   LLMProvider = "custom"
)

// ProviderConfig 提供商配置
type ProviderConfig struct {
	Name      LLMProvider
	BaseURL   string
	AuthHeader string
	AuthPrefix string
	Models    []string
}

// ProviderRegistry 提供商注册表
var ProviderRegistry = map[LLMProvider]*ProviderConfig{
	ProviderOpenAI: {
		Name:       ProviderOpenAI,
		BaseURL:    "https://api.openai.com/v1",
		AuthHeader: "Authorization",
		AuthPrefix: "Bearer ",
		Models: []string{
			"gpt-4", "gpt-4-turbo", "gpt-4o", "gpt-4o-mini",
			"gpt-3.5-turbo", "gpt-3.5-turbo-16k",
			"text-embedding-ada-002", "text-embedding-3-small", "text-embedding-3-large",
		},
	},
	ProviderClaude: {
		Name:       ProviderClaude,
		BaseURL:    "https://api.anthropic.com/v1",
		AuthHeader: "x-api-key",
		AuthPrefix: "",
		Models: []string{
			"claude-3-opus-20240229", "claude-3-sonnet-20240229",
			"claude-3-haiku-20240307", "claude-3-5-sonnet-20241022",
		},
	},
	ProviderDeepSeek: {
		Name:       ProviderDeepSeek,
		BaseURL:    "https://api.deepseek.com/v1",
		AuthHeader: "Authorization",
		AuthPrefix: "Bearer ",
		Models: []string{
			"deepseek-chat", "deepseek-coder",
		},
	},
	ProviderOllama: {
		Name:       ProviderOllama,
		BaseURL:    "http://localhost:11434/v1",
		AuthHeader: "",
		AuthPrefix: "",
		Models: []string{
			"llama2", "mistral", "codellama", "phi",
		},
	},
}

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

// detectProvider 检测提供商
func detectProvider(model string) *ProviderConfig {
	for _, provider := range ProviderRegistry {
		for _, m := range provider.Models {
			if m == model {
				return provider
			}
		}
	}
	
	// 默认使用 OpenAI
	return ProviderRegistry[ProviderOpenAI]
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
		// Claude 使用 x-api-key
		apiKey = c.GetHeader("x-api-key")
	}
	if apiKey == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing API key"})
		return
	}

	// 检测提供商
	provider := detectProvider(chatReq.Model)
	
	// 脱敏记录日志
	maskedKey := maskAPIKey(apiKey)
	log.Printf("Chat request: model=%s, provider=%s, user=%s, key=%s", 
		chatReq.Model, provider.Name, chatReq.User, maskedKey)

	// 构建目标 URL
	targetURL := fmt.Sprintf("%s/chat/completions", provider.BaseURL)
	
	// Claude API 需要特殊处理
	if provider.Name == ProviderClaude {
		return h.handleClaudeRequest(c, body, chatReq, apiKey, provider, startTime)
	}

	// 创建请求
	req, err := http.NewRequest("POST", targetURL, bytes.NewReader(body))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	// 设置 Header
	req.Header.Set("Content-Type", "application/json")
	if provider.AuthHeader != "" {
		req.Header.Set(provider.AuthHeader, provider.AuthPrefix+apiKey)
	}
	
	// 复制自定义 Header
	if c.GetHeader("X-Request-Id") != "" {
		req.Header.Set("X-Request-Id", c.GetHeader("X-Request-Id"))
	}

	// 发送请求
	resp, err := h.httpClient.Do(req)
	if err != nil {
		h.recordError(c, chatReq, string(provider.Name), startTime, err)
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
		Provider:     string(provider.Name),
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

// handleClaudeRequest 处理 Claude API 请求
func (h *ProxyHandler) handleClaudeRequest(
	c *gin.Context,
	body []byte,
	chatReq OpenAIChatRequest,
	apiKey string,
	provider *ProviderConfig,
	startTime time.Time,
) {
	// 转换 OpenAI 格式到 Claude 格式
	claudeReq := convertToClaudeRequest(chatReq)
	
	claudeBody, err := json.Marshal(claudeReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to convert request"})
		return
	}

	// Claude Messages API
	targetURL := fmt.Sprintf("%s/messages", provider.BaseURL)
	
	req, err := http.NewRequest("POST", targetURL, bytes.NewReader(claudeBody))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	// 设置 Claude 特定 Header
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	// 发送请求
	resp, err := h.httpClient.Do(req)
	if err != nil {
		h.recordError(c, chatReq, string(provider.Name), startTime, err)
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

	// 转换 Claude 响应到 OpenAI 格式
	claudeResp := convertFromClaudeResponse(respBody, chatReq.Model)
	openaiResp, _ := json.Marshal(claudeResp)

	// 计算延迟
	latencyMs := int(time.Since(startTime).Milliseconds())

	// 记录请求
	record := &RequestRecord{
		ID:           uuid.New().String(),
		Timestamp:    startTime,
		Model:        chatReq.Model,
		Provider:     string(provider.Name),
		InputTokens:  claudeResp.Usage.InputTokens,
		OutputTokens: claudeResp.Usage.OutputTokens,
		TotalTokens:  claudeResp.Usage.InputTokens + claudeResp.Usage.OutputTokens,
		CostUSD:      CalculateCost(chatReq.Model, claudeResp.Usage.InputTokens, claudeResp.Usage.OutputTokens),
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

	// 返回响应（转换为 OpenAI 格式）
	c.Data(resp.StatusCode, "application/json", openaiResp)
}

// ClaudeRequest Claude 请求格式
type ClaudeRequest struct {
	Model     string    `json:"model"`
	MaxTokens int       `json:"max_tokens"`
	Messages  []Message `json:"messages"`
	Stream    bool      `json:"stream,omitempty"`
}

// ClaudeResponse Claude 响应格式
type ClaudeResponse struct {
	ID         string `json:"id"`
	Type       string `json:"type"`
	Role       string `json:"role"`
	Content    []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	Model      string `json:"model"`
	StopReason string `json:"stop_reason"`
	Usage      struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

// convertToClaudeRequest 转换 OpenAI 请求到 Claude 格式
func convertToClaudeRequest(req OpenAIChatRequest) ClaudeRequest {
	claudeReq := ClaudeRequest{
		Model:     req.Model,
		MaxTokens: req.MaxTokens,
		Stream:    req.Stream,
	}

	// 过滤掉 system message（Claude 使用单独的 system 参数）
	for _, msg := range req.Messages {
		if msg.Role != "system" {
			claudeReq.Messages = append(claudeReq.Messages, msg)
		}
	}

	return claudeReq
}

// convertFromClaudeResponse 转换 Claude 响应到 OpenAI 格式
func convertFromClaudeResponse(body []byte, model string) OpenAIChatResponse {
	var claudeResp ClaudeResponse
	if err := json.Unmarshal(body, &claudeResp); err != nil {
		return OpenAIChatResponse{}
	}

	// 提取文本内容
	content := ""
	for _, c := range claudeResp.Content {
		if c.Type == "text" {
			content += c.Text
		}
	}

	return OpenAIChatResponse{
		ID:      claudeResp.ID,
		Object:  "chat.completion",
		Created: time.Now().Unix(),
		Model:   model,
		Choices: []Choice{
			{
				Index: 0,
				Message: Message{
					Role:    "assistant",
					Content: content,
				},
				FinishReason: claudeResp.StopReason,
			},
		},
		Usage: Usage{
			PromptTokens:     claudeResp.Usage.InputTokens,
			CompletionTokens: claudeResp.Usage.OutputTokens,
			TotalTokens:      claudeResp.Usage.InputTokens + claudeResp.Usage.OutputTokens,
		},
	}
}

// Completions 处理补全请求
func (h *ProxyHandler) Completions(c *gin.Context) {
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

	// 检测提供商
	provider := detectProvider(embedReq.Model)
	
	// 脱敏记录日志
	maskedKey := maskAPIKey(apiKey)
	log.Printf("Embedding request: model=%s, provider=%s, key=%s", 
		embedReq.Model, provider.Name, maskedKey)

	// 构建目标 URL
	targetURL := fmt.Sprintf("%s/embeddings", provider.BaseURL)

	// 创建请求
	req, err := http.NewRequest("POST", targetURL, bytes.NewReader(body))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	// 设置 Header
	req.Header.Set("Content-Type", "application/json")
	if provider.AuthHeader != "" {
		req.Header.Set(provider.AuthHeader, provider.AuthPrefix+apiKey)
	}

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
		Provider:    string(provider.Name),
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
	provider := c.Query("provider")

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
		"data":      requests,
		"total":     total,
		"limit":     limit,
		"offset":    offset,
		"provider":  provider,
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
