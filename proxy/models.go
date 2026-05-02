package main

import (
	"time"
)

// RequestRecord 请求记录
type RequestRecord struct {
	ID            string    `json:"id"`
	Timestamp     time.Time `json:"timestamp"`
	Model         string    `json:"model"`
	Provider      string    `json:"provider"`
	InputTokens   int       `json:"input_tokens"`
	OutputTokens  int       `json:"output_tokens"`
	TotalTokens   int       `json:"total_tokens"`
	CostUSD       float64   `json:"cost_usd"`
	LatencyMs     int       `json:"latency_ms"`
	TTFTMs        int       `json:"ttft_ms"`
	StatusCode    int       `json:"status_code"`
	IsError       bool      `json:"is_error"`
	ErrorMessage  string    `json:"error_message,omitempty"`
	Stream        bool      `json:"stream"`
	UserID        string    `json:"user_id,omitempty"`
	Tags          string    `json:"tags,omitempty"`
	Metadata      string    `json:"metadata,omitempty"`
	RequestBody   string    `json:"request_body,omitempty"`
	ResponseBody  string    `json:"response_body,omitempty"`
	TraceID       string    `json:"trace_id,omitempty"`
	ParentSpanID  string    `json:"parent_span_id,omitempty"`
}

// OverviewResponse 总览响应
type OverviewResponse struct {
	TotalRequests  int64   `json:"total_requests"`
	TotalCostUSD   float64 `json:"total_cost_usd"`
	AvgLatencyMs   int     `json:"avg_latency_ms"`
	ErrorRate      float64 `json:"error_rate"`
	RequestsChange float64 `json:"requests_change"`
	CostChange     float64 `json:"cost_change"`
	LatencyChange  float64 `json:"latency_change"`
	ErrorChange    float64 `json:"error_change"`
}

// CostAnalysis 成本分析
type CostAnalysis struct {
	ByModel  []ModelCost   `json:"by_model"`
	ByTime   []TimeCost    `json:"by_time"`
	ByUser   []UserCost    `json:"by_user"`
}

// ModelCost 模型成本
type ModelCost struct {
	Model        string  `json:"model"`
	TotalCostUSD float64 `json:"total_cost_usd"`
	RequestCount int64   `json:"request_count"`
	AvgCostUSD   float64 `json:"avg_cost_usd"`
}

// TimeCost 时间成本
type TimeCost struct {
	Timestamp    time.Time `json:"timestamp"`
	TotalCostUSD float64   `json:"total_cost_usd"`
	RequestCount int64     `json:"request_count"`
}

// UserCost 用户成本
type UserCost struct {
	UserID       string  `json:"user_id"`
	TotalCostUSD float64 `json:"total_cost_usd"`
	RequestCount int64   `json:"request_count"`
}

// PerformanceAnalysis 性能分析
type PerformanceAnalysis struct {
	LatencyP50  int     `json:"latency_p50"`
	LatencyP95  int     `json:"latency_p95"`
	LatencyP99  int     `json:"latency_p99"`
	AvgLatency  int     `json:"avg_latency"`
	ErrorRate   float64 `json:"error_rate"`
	TTFTP50     int     `json:"ttft_p50"`
	TTFTP95     int     `json:"ttft_p95"`
}

// Settings 配置
type Settings struct {
	PrivacyLevel    string `json:"privacy_level"`
	DataRetentionDays int  `json:"data_retention_days"`
	MaskAPIKeys     bool   `json:"mask_api_keys"`
	MaxRequestBodySize int `json:"max_request_body_size"`
}

// ModelPricing 模型定价
type ModelPricing struct {
	Model           string  `json:"model"`
	InputPricePer1K float64 `json:"input_price_per_1k"`
	OutputPricePer1K float64 `json:"output_price_per_1k"`
}

// OpenAIChatRequest OpenAI 聊天请求
type OpenAIChatRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
	Temperature float64   `json:"temperature,omitempty"`
	Stream      bool      `json:"stream,omitempty"`
	User        string    `json:"user,omitempty"`
}

// Message 消息
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// OpenAIChatResponse OpenAI 聊天响应
type OpenAIChatResponse struct {
	ID      string   `json:"id"`
	Object  string   `json:"object"`
	Created int64    `json:"created"`
	Model   string   `json:"model"`
	Choices []Choice `json:"choices"`
	Usage   Usage    `json:"usage"`
}

// Choice 选项
type Choice struct {
	Index        int     `json:"index"`
	Message      Message `json:"message"`
	FinishReason string  `json:"finish_reason"`
}

// Usage 用量
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// OpenAIEmbeddingRequest OpenAI 嵌入请求
type OpenAIEmbeddingRequest struct {
	Model string   `json:"model"`
	Input []string `json:"input"`
	User  string   `json:"user,omitempty"`
}

// OpenAIEmbeddingResponse OpenAI 嵌入响应
type OpenAIEmbeddingResponse struct {
	Object string         `json:"object"`
	Data   []EmbeddingData `json:"data"`
	Model  string         `json:"model"`
	Usage  Usage          `json:"usage"`
}

// EmbeddingData 嵌入数据
type EmbeddingData struct {
	Object    string    `json:"object"`
	Embedding []float64 `json:"embedding"`
	Index     int       `json:"index"`
}
