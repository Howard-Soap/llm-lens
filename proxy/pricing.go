package main

// ModelPricingMap 模型定价表 (USD per 1K tokens)
var ModelPricingMap = map[string]ModelPricing{
	// OpenAI GPT-4 系列
	"gpt-4": {
		Model:            "gpt-4",
		InputPricePer1K:  0.03,
		OutputPricePer1K: 0.06,
	},
	"gpt-4-turbo": {
		Model:            "gpt-4-turbo",
		InputPricePer1K:  0.01,
		OutputPricePer1K: 0.03,
	},
	"gpt-4o": {
		Model:            "gpt-4o",
		InputPricePer1K:  0.005,
		OutputPricePer1K: 0.015,
	},
	"gpt-4o-mini": {
		Model:            "gpt-4o-mini",
		InputPricePer1K:  0.00015,
		OutputPricePer1K: 0.0006,
	},

	// OpenAI GPT-3.5 系列
	"gpt-3.5-turbo": {
		Model:            "gpt-3.5-turbo",
		InputPricePer1K:  0.0005,
		OutputPricePer1K: 0.0015,
	},
	"gpt-3.5-turbo-16k": {
		Model:            "gpt-3.5-turbo-16k",
		InputPricePer1K:  0.003,
		OutputPricePer1K: 0.004,
	},

	// Claude 系列
	"claude-3-opus-20240229": {
		Model:            "claude-3-opus-20240229",
		InputPricePer1K:  0.015,
		OutputPricePer1K: 0.075,
	},
	"claude-3-sonnet-20240229": {
		Model:            "claude-3-sonnet-20240229",
		InputPricePer1K:  0.003,
		OutputPricePer1K: 0.015,
	},
	"claude-3-haiku-20240307": {
		Model:            "claude-3-haiku-20240307",
		InputPricePer1K:  0.00025,
		OutputPricePer1K: 0.00125,
	},
	"claude-3-5-sonnet-20241022": {
		Model:            "claude-3-5-sonnet-20241022",
		InputPricePer1K:  0.003,
		OutputPricePer1K: 0.015,
	},

	// DeepSeek 系列
	"deepseek-chat": {
		Model:            "deepseek-chat",
		InputPricePer1K:  0.00014,
		OutputPricePer1K: 0.00028,
	},
	"deepseek-coder": {
		Model:            "deepseek-coder",
		InputPricePer1K:  0.00014,
		OutputPricePer1K: 0.00028,
	},

	// 嵌入模型
	"text-embedding-ada-002": {
		Model:            "text-embedding-ada-002",
		InputPricePer1K:  0.0001,
		OutputPricePer1K: 0,
	},
	"text-embedding-3-small": {
		Model:            "text-embedding-3-small",
		InputPricePer1K:  0.00002,
		OutputPricePer1K: 0,
	},
	"text-embedding-3-large": {
		Model:            "text-embedding-3-large",
		InputPricePer1K:  0.00013,
		OutputPricePer1K: 0,
	},
}

// CalculateCost 计算成本
func CalculateCost(model string, inputTokens, outputTokens int) float64 {
	pricing, exists := ModelPricingMap[model]
	if !exists {
		// 默认定价（如果模型不在表中）
		return float64(inputTokens+outputTokens) / 1000 * 0.002
	}

	inputCost := float64(inputTokens) / 1000 * pricing.InputPricePer1K
	outputCost := float64(outputTokens) / 1000 * pricing.OutputPricePer1K

	return inputCost + outputCost
}

// GetModelProvider 获取模型提供商
func GetModelProvider(model string) string {
	switch {
	case contains(model, "gpt"):
		return "openai"
	case contains(model, "claude"):
		return "anthropic"
	case contains(model, "deepseek"):
		return "deepseek"
	case contains(model, "embedding"):
		return "openai"
	default:
		return "unknown"
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && (s[0:len(substr)] == substr || contains(s[1:], substr)))
}
