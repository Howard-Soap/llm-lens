# LLM Lens — 产品需求文档 (PRD)

> **一句话定位**：开源、免费、零依赖的 LLM 可观测性工具，一行代码接入，专为独立开发者和小团队设计。

---

## 1. 产品概述

### 1.1 产品名称
**LLM Lens** — 让 LLM 应用的运行状态一目了然

### 1.2 产品愿景
成为独立开发者和小团队的首选 LLM 监控工具。不卖功能，不搞企业套路，就是好用、免费、开源。

### 1.3 目标用户

| 用户类型 | 痛点 | 我们怎么解决 |
|---------|------|-------------|
| **独立开发者** | 用了多个 LLM API，不知道每月花了多少钱 | 一个 Dashboard 看所有模型的成本 |
| **小团队（2-10人）** | 想监控 LLM 但 Langfuse 太重、Datadog 太贵 | 一行 docker run，完全免费 |
| **AI Agent 开发者** | Agent 多步推理链看不到，调试靠猜 | Agent Trace 可视化 |
| **AI 应用创业者** | 需要给客户展示 LLM 调用情况 | 分享只读链接 |

### 1.4 核心价值主张

```
❌ Langfuse：需要 ClickHouse + PostgreSQL，自部署复杂
❌ Helicone：免费层限制多，Pro 要 $20/座/月
❌ LangSmith：绑定 LangChain，不用 LangChain 就没法用
❌ Datadog LLM：贵，面向企业

✅ LLM Lens：一行 docker run，完全免费，Agent 专用监控
```

---

## 2. 功能规格

### 2.1 代理转发层（核心）

**原理**：用户把 LLM API 的 `base_url` 指向 LLM Lens，Lens 转发请求到真实 API，同时记录所有数据。

```
用户代码 → LLM Lens (代理) → OpenAI / Claude / DeepSeek
              ↓
         记录请求/响应/延迟/token/成本
              ↓
         存储到 SQLite
```

#### 支持的 API 协议

| 协议 | 优先级 | 说明 |
|------|--------|------|
| OpenAI API | P0 | `/v1/chat/completions`, `/v1/embeddings`, `/v1/completions` |
| Claude API | P1 | Anthropic Messages API |
| DeepSeek API | P1 | 兼容 OpenAI 协议 |
| 本地模型 | P2 | Ollama / llama.cpp（兼容 OpenAI 协议） |

#### 代理模式

```python
# 用户只需要改一行代码
import openai

client = openai.OpenAI(
    api_key="sk-xxx",
    base_url="http://localhost:3000/v1"  # ← 改这一行
)

# 其他代码完全不用改
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello"}]
)
```

#### 采集的数据

| 字段 | 说明 |
|------|------|
| `request_id` | 唯一请求 ID |
| `timestamp` | 请求时间 |
| `model` | 模型名称 |
| `provider` | 提供商（openai/claude/deepseek） |
| `input_tokens` | 输入 token 数 |
| `output_tokens` | 输出 token 数 |
| `total_tokens` | 总 token 数 |
| `cost_usd` | 费用（美元） |
| `latency_ms` | 总延迟（毫秒） |
| `ttft_ms` | 首 token 延迟（流式） |
| `status_code` | HTTP 状态码 |
| `is_error` | 是否错误 |
| `error_message` | 错误信息 |
| `request_body` | 请求体（可选，默认脱敏） |
| `response_body` | 响应体（可选，默认脱敏） |
| `stream` | 是否流式 |
| `user_id` | 用户标识（从 header 或 API Key 推断） |
| `tags` | 自定义标签 |
| `metadata` | 额外元数据（JSON） |

#### 流式支持

- 流式和非流式请求都支持
- 流式请求自动计算 `ttft_ms`（首 token 延迟）
- 流式响应完整拼接后存储（不存中间 chunk）

#### 错误处理

- 代理层不影响原始请求的性能（异步记录）
- 如果 Lens 服务挂了，请求正常转发（不阻塞）
- 超时/错误自动重试（可配置）

---

### 2.2 Dashboard 系统（Web UI）

#### 2.2.1 三层看板架构

LLM Lens 提供分层的可定制看板系统，不同角色看到不同视图：

```
┌─────────────────────────────────────────────────────────────┐
│                     看板系统                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  个人看板    │  │  项目看板    │  │  企业大屏    │        │
│  │  (Solo)     │  │  (Team)     │  │  (Enterprise)│        │
│  │             │  │             │  │             │        │
│  │  我的成本    │  │  团队概览    │  │  全局监控    │        │
│  │  我的请求    │  │  成员贡献    │  │  多项目对比  │        │
│  │  我的模型    │  │  项目健康度  │  │  实时告警    │        │
│  │             │  │  协作标注    │  │  大屏展示    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│           ↓ 所有层级都支持 ↓                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  可拖拽组件库（Notion 风格）                          │   │
│  │                                                     │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │   │
│  │  │折线图 │ │柱状图 │ │饼图  │ │数字卡 │ │表格  │    │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘    │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │   │
│  │  │热力图 │ │排行榜 │ │时间线 │ │告警流 │ │状态灯 │    │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2.2 个人看板（Solo Developer）

适合独立开发者，关注自己的数据：

```
┌─────────────────────────────────────────────────────────────┐
│  我的看板                          [+ 添加组件] [分享链接]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────┐ ┌────────────────────┐            │
│  │  今日成本            │ │  今日请求数          │            │
│  │  $2.34              │ │  1,234              │            │
│  │  ↑ 12% vs 昨天      │ │  ↑ 8% vs 昨天       │            │
│  └────────────────────┘ └────────────────────┘            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  成本趋势（7天）                                     │   │
│  │  📈 折线图                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────┐ ┌────────────────────┐            │
│  │  模型使用分布        │ │  最近请求            │            │
│  │  🥧 饼图             │ │  📋 实时列表         │            │
│  └────────────────────┘ └────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

**默认组件**：
- 今日/本周/本月成本
- 请求量趋势
- 模型使用分布
- 最近请求列表
- 错误率
- 平均延迟

#### 2.2.3 项目看板（Team Project）

适合小团队，关注项目健康度：

```
┌─────────────────────────────────────────────────────────────┐
│  项目: My AI App              [成员: 3] [设置] [分享]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│  │ 总请求  │ │ 总成本  │ │ 成员数  │ │ 活跃度  │              │
│  │ 45.2K  │ │ $234   │ │ 3      │ │ 🟢 高   │              │
│  └────────┘ └────────┘ └────────┘ └────────┘              │
│                                                             │
│  ┌────────────────────┐ ┌────────────────────┐            │
│  │  成员贡献排行        │ │  模型成本对比        │            │
│  │  1. 张三 $120       │ │  GPT-4: $180       │            │
│  │  2. 李四 $80        │ │  Claude: $40       │            │
│  │  3. 王五 $34        │ │  DeepSeek: $14     │            │
│  └────────────────────┘ └────────────────────┘            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  项目时间线                                          │   │
│  │  5/1 部署 v1.0  →  5/2 发现错误率升高  →  5/3 修复   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  告警 & 事件                                         │   │
│  │  🔴 14:23 错误率突增 8% (GPT-4)                     │   │
│  │  🟡 13:45 延迟 P95 > 5s                             │   │
│  │  🟢 12:00 日成本预算 50%                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**额外组件**：
- 成员贡献排行
- 项目时间线（可标注事件）
- 告警事件流
- 协作标注（在图表上留言）
- 项目健康度评分

#### 2.2.4 企业大屏（Enterprise Dashboard）

适合挂在墙上或投屏展示：

```
┌─────────────────────────────────────────────────────────────┐
│  ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛  │
│  ⬛                                                    ⬛  │
│  ⬛   LLM Lens — 全局监控大屏                           ⬛  │
│  ⬛                                                    ⬛  │
│  ⬛   ┌──────────┐ ┌──────────┐ ┌──────────┐          ⬛  │
│  ⬛   │ 总请求    │ │ 总成本    │ │ 活跃项目  │          ⬛  │
│  ⬛   │ 1.2M     │ │ $12,345  │ │ 8        │          ⬛  │
│  ⬛   └──────────┘ └──────────┘ └──────────┘          ⬛  │
│  ⬛                                                    ⬛  │
│  ⬛   ┌────────────────────┐ ┌────────────────────┐   ⬛  │
│  ⬛   │  全局请求趋势        │ │  项目成本排行        │   ⬛  │
│  ⬛   │  📈 实时折线图       │ │  📊 柱状图          │   ⬛  │
│  ⬛   └────────────────────┘ └────────────────────┘   ⬛  │
│  ⬛                                                    ⬛  │
│  ⬛   ┌────────────────────────────────────────────┐   ⬛  │
│  ⬛   │  实时告警流                                  │   ⬛  │
│  ⬛   │  🔴 14:23 项目A 错误率突增                  │   ⬛  │
│  ⬛   │  🟡 14:20 项目B 成本超预算 80%              │   ⬛  │
│  ⬛   │  🟢 14:15 项目C 部署完成                    │   ⬛  │
│  ⬛   └────────────────────────────────────────────┘   ⬛  │
│  ⬛                                                    ⬛  │
│  ⬛   ⚫ 自动刷新 10s  │  更新时间: 14:23:45           ⬛  │
│  ⬛                                                    ⬛  │
│  ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛  │
└─────────────────────────────────────────────────────────────┘
```

**特性**：
- 全屏模式，无边框
- 自动刷新（可配置 5s / 10s / 30s）
- 暗色主题，高对比度
- 多项目聚合视图
- 实时告警滚动
- 适合投影仪/电视展示

#### 2.2.5 组件库（可拖拽）

| 组件 | 说明 | 适用场景 |
|------|------|---------|
| **数字卡片** | 单个指标的大数字展示 | 成本、请求数、错误率 |
| **折线图** | 时间序列趋势 | 请求量、成本、延迟趋势 |
| **柱状图** | 分类对比 | 模型成本对比、成员贡献 |
| **饼图/环形图** | 占比分布 | 模型使用分布 |
| **表格** | 详细数据列表 | 最近请求、Top 用户 |
| **排行榜** | 排序列表 | 最贵请求、最慢请求 |
| **热力图** | 时间分布 | 按小时/星期的请求分布 |
| **时间线** | 事件序列 | 部署、告警、变更记录 |
| **告警流** | 实时告警滚动 | 全局告警监控 |
| **状态灯** | 健康状态 | 服务状态、SLA 达标率 |
| **Markdown** | 自由文本 | 说明、备注、文档链接 |
| **iframe** | 嵌入外部页面 | Grafana、其他监控 |

#### 2.2.6 请求列表页（Requests）

- 列表展示所有请求，支持分页
- 筛选条件：
  - 时间范围（1h / 24h / 7d / 30d / 自定义）
  - 模型（多选）
  - 状态（成功 / 错误）
  - 用户 ID
  - 自定义标签
- 排序：时间、延迟、token 数、成本
- 搜索：在请求/响应内容中搜索

#### 2.2.3 请求详情页（Request Detail）

```
┌─────────────────────────────────────────────────────────────┐
│  ← 返回    请求详情                     [复制] [分享链接]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  基本信息                                                    │
│  ─────────                                                  │
│  ID: req_abc123        模型: gpt-4                          │
│  时间: 2025-05-02 14:23:01    状态: 200 OK                  │
│  延迟: 180ms (TTFT: 45ms)   流式: 是                        │
│                                                             │
│  Token & 成本                                               │
│  ──────────────                                             │
│  输入: 150 tokens    输出: 84 tokens    总计: 234 tokens    │
│  成本: $0.00312                                              │
│                                                             │
│  请求 (Messages)                                            │
│  ────────────────                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [                                                    │   │
│  │   {"role": "system", "content": "You are a..."},    │   │
│  │   {"role": "user", "content": "Hello"}              │   │
│  │ ]                                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  响应                                                       │
│  ────                                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ {"choices": [{"message": {"content": "Hi! How..."}}]}│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  元数据                                                     │
│  ──────                                                     │
│  {"user_id": "user_123", "session": "abc", ...}            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2.4 成本分析页（Costs）

- **按模型**：每个模型的总成本、请求数、平均成本
- **按时间**：日/周/月成本趋势
- **按用户**：每个用户/API Key 的成本排名
- **预算告警**：设置月度预算，超支提醒
- **成本预测**：基于历史趋势预测本月成本

#### 2.2.5 性能分析页（Performance）

- **延迟分布**：P50 / P95 / P99 延迟
- **延迟趋势**：延迟随时间的变化
- **首 Token 延迟**（TTFT）：流式场景的关键指标
- **错误率**：按模型/时间的错误率趋势
- **吞吐量**：每分钟请求数（RPM）

#### 2.2.6 设置页（Settings）

- **API Key 管理**：添加/删除用于代理认证的 Key
- **模型定价**：自定义每个模型的 token 价格
- **数据保留**：设置数据保留天数（默认 30 天）
- **导出**：导出为 JSON / CSV
- **告警配置**：Slack / 邮件 / 飞书 Webhook
- **隐私设置**：是否记录请求/响应内容

---

### 2.3 Agent Trace（P1 — 差异化功能）

#### 2.3.1 Trace 概念

```
一次用户请求可能触发多次 LLM 调用（Agent 场景）

用户: "帮我订明天北京到上海的机票"
  └─ Agent 思考 (GPT-4, 200 tokens, $0.006)
      └─ 调用工具: search_flights (外部 API)
          └─ Agent 总结 (GPT-4, 150 tokens, $0.004)
              └─ 调用工具: book_flight (外部 API)
                  └─ 最终回复 (GPT-4, 100 tokens, $0.003)

总成本: $0.013  总延迟: 3.2s  总 tokens: 450
```

#### 2.3.2 Trace 可视化

```
┌─────────────────────────────────────────────────────────────┐
│  Trace: tr_abc123              总耗时: 3.2s  成本: $0.013   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ▼ Agent 思考 (GPT-4)          200 tokens  $0.006  0.8s    │
│    └─ 📎 调用 search_flights   ──         ──      0.5s    │
│        └─ ▼ Agent 总结 (GPT-4) 150 tokens $0.004  0.6s    │
│            └─ 📎 调用 book     ──         ──      0.8s    │
│                └─ ▼ 最终回复    100 tokens $0.003  0.5s    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  时间轴视图（甘特图）                                 │   │
│  │  ├─ Agent 思考   ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│  │  ├─ search API   ░░░░████░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│  │  ├─ Agent 总结   ░░░░░░░░████░░░░░░░░░░░░░░░░░░░░  │   │
│  │  ├─ book API     ░░░░░░░░░░░░████░░░░░░░░░░░░░░░░  │   │
│  │  └─ 最终回复     ░░░░░░░░░░░░░░░░████░░░░░░░░░░░░  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  点击任意节点查看详情...                                     │
└─────────────────────────────────────────────────────────────┘
```

#### 2.3.3 实现方式

用户通过 SDK 或 HTTP Header 传入 `trace_id`：

```python
import openai

client = openai.OpenAI(base_url="http://localhost:3000/v1")

# 方式 1：通过 header 传入 trace_id
response = client.chat.completions.create(
    model="gpt-4",
    messages=[...],
    extra_headers={"X-Trace-Id": "tr_abc123"}
)

# 方式 2：通过 metadata 传入
response = client.chat.completions.create(
    model="gpt-4",
    messages=[...],
    metadata={"trace_id": "tr_abc123", "step": "thinking"}
)
```

---

### 2.4 告警系统（P1）

#### 告警规则

| 规则类型 | 说明 | 默认阈值 |
|---------|------|---------|
| 错误率 | 某模型的错误率超过阈值 | 5% |
| 延迟 | P95 延迟超过阈值 | 5000ms |
| 成本 | 日成本超过预算 | 无（用户自定义） |
| Token 用量 | 日 token 用量超过阈值 | 无 |

#### 告警渠道

- **Webhook**：通用 HTTP 回调
- **Slack**：Slack Incoming Webhook
- **邮件**：SMTP
- **飞书**：飞书机器人 Webhook
- **Discord**：Discord Webhook

---

## 3. 非功能需求

### 3.1 性能

| 指标 | 目标 |
|------|------|
| 代理延迟增加 | < 5ms（异步记录，不阻塞请求） |
| Dashboard 加载 | < 2s |
| 查询响应 | < 500ms（100 万条数据） |
| 并发支持 | 1000 QPS（代理层） |

### 3.2 存储

| 数据量 | 存储估算 |
|--------|---------|
| 每条请求记录 | ~1KB（不含请求/响应体） |
| 每天 1 万请求 | ~10MB/天 |
| 每天 100 万请求 | ~1GB/天 |
| 默认保留 | 30 天 |

### 3.3 安全

#### 3.3.1 用户 LLM API Key 安全（OpenAI/Claude 等）

用户的 LLM API Key 会经过代理层转发，必须保证绝对安全：

| 安全措施 | 说明 |
|---------|------|
| **代理层不存储原文** | API Key 只在内存中用于转发，处理完即丢弃，不落盘 |
| **日志脱敏** | 日志中只显示 `sk-...abc123`（后四位），完整 Key 不进日志 |
| **可选透传模式** | 代理层只做透传，不解密请求体（端到端加密） |
| **内存安全** | 使用 Go 的安全内存处理，避免内存泄露 |
| **无缓存策略** | 不缓存 API Key，每次请求从 Header 实时读取 |

```go
// 代理层安全实现示例
func (p *Proxy) ForwardRequest(req *http.Request) {
    // 1. 从 Header 读取 API Key
    apiKey := req.Header.Get("Authorization")
    
    // 2. 脱敏后记录日志
    maskedKey := maskAPIKey(apiKey)  // "sk-...abc123"
    log.Printf("Request from %s, key: %s", req.RemoteAddr, maskedKey)
    
    // 3. 转发请求（Key 只在内存中，不存储）
    resp := p.forwardToUpstream(req)
    
    // 4. 异步记录请求元数据（不含 Key）
    go p.recordRequestMetadata(req, resp)
    
    // 5. 丢弃 Key 引用
    apiKey = ""
}

func maskAPIKey(key string) string {
    if len(key) < 8 {
        return "***"
    }
    return key[:3] + "..." + key[len(key)-4:]
}
```

#### 3.3.2 LLM Lens 自身认证

访问 Dashboard 和 API 需要认证：

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| **本地模式** | 默认不需要认证（localhost 访问） | 个人开发 |
| **远程模式** | Bearer Token 认证 | 远程服务器 |
| **Session 机制** | Dashboard 登录后保持会话 | 日常使用 |
| **API Key 认证** | 程序化访问 | CI/CD 集成 |

```python
# 认证中间件示例
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

async def verify_auth(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    # 本地模式：跳过认证
    if settings.LOCAL_MODE:
        return True
    
    # 远程模式：验证 Token
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication"
        )
    
    token_hash = hash_token(credentials.credentials)
    if not db.verify_token(token_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    return True
```

#### 3.3.3 数据安全

| 安全措施 | 说明 |
|---------|------|
| **请求/响应脱敏** | 默认不记录完整请求/响应内容，只记录元数据 |
| **可配置记录级别** | 用户可选择：不记录 / 只记录元数据 / 记录脱敏内容 / 完整记录 |
| **数据加密存储** | 敏感字段（如自定义标签中的密钥）使用 AES-256 加密 |
| **自动数据清理** | 过期数据自动删除（可配置保留天数） |
| **导出加密** | 导出数据时可选密码保护 |

```python
# 数据记录级别配置
class PrivacySettings(Enum):
    NONE = "none"              # 不记录任何内容
    METADATA_ONLY = "metadata" # 只记录元数据（token、延迟、成本）
    MASKED = "masked"          # 记录脱敏内容（隐藏敏感信息）
    FULL = "full"              # 完整记录（用于调试）

# 脱敏处理
def mask_sensitive_data(content: str) -> str:
    # 隐藏 API Key
    content = re.sub(r'sk-[a-zA-Z0-9]{20,}', 'sk-***', content)
    # 隐藏邮箱
    content = re.sub(r'[\w.-]+@[\w.-]+\.\w+', '***@***.***', content)
    # 隐藏手机号
    content = re.sub(r'1[3-9]\d{9}', '1**********', content)
    return content
```

#### 3.3.4 网络安全

| 安全措施 | 说明 |
|---------|------|
| **HTTPS 支持** | 通过反向代理（Nginx/Caddy）启用 HTTPS |
| **CORS 配置** | 严格限制允许的域名 |
| **Rate Limiting** | 防止暴力破解和 DDoS |
| **IP 白名单** | 可选：限制访问 IP 范围 |
| **CSP 头** | 防止 XSS 攻击 |

```python
# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # 不要用 "*"
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Rate Limiting
@app.middleware("http")
async def rate_limit(request: Request, call_next):
    client_ip = request.client.host
    if not rate_limiter.allow(client_ip):
        raise HTTPException(status_code=429, detail="Too many requests")
    return await call_next(request)
```

#### 3.3.5 Docker 安全

```yaml
# docker-compose.yml 安全配置
services:
  llm-lens:
    image: llm-lens:latest
    # 不以 root 运行
    user: "1000:1000"
    # 只读文件系统
    read_only: true
    # 限制资源
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    # 安全选项
    security_opt:
      - no-new-privileges:true
    # 只暴露必要端口
    ports:
      - "127.0.0.1:3000:3000"  # 只监听本地
    # 环境变量（敏感配置）
    environment:
      - LLM_LENS_SECRET_KEY=${SECRET_KEY}  # 从 .env 读取
      - LLM_LENS_LOCAL_MODE=true
```

#### 3.3.6 安全审计

| 功能 | 说明 |
|------|------|
| **操作日志** | 记录所有敏感操作（登录、创建 Key、修改设置） |
| **访问日志** | 记录所有 API 访问（IP、时间、路径） |
| **异常检测** | 检测异常访问模式（频繁失败、大量请求） |
| **安全通知** | 异常活动发送告警（邮件/Slack/飞书） |

```sql
-- 安全审计表
CREATE TABLE security_audit_log (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    event_type TEXT NOT NULL,    -- login / api_key_create / settings_change
    user_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,                -- JSON: 事件详情
    risk_level TEXT DEFAULT 'low'  -- low / medium / high
);

CREATE INDEX idx_audit_timestamp ON security_audit_log(timestamp);
CREATE INDEX idx_audit_event_type ON security_audit_log(event_type);
CREATE INDEX idx_audit_user_id ON security_audit_log(user_id);
```

#### 3.3.7 安全配置汇总

```yaml
# 安全相关配置项
security:
  # 认证
  local_mode: true                    # 本地模式（跳过认证）
  secret_key: "your-secret-key"       # Session 密钥
  session_timeout: 3600               # Session 超时（秒）
  
  # API Key
  api_key_length: 32                  # API Key 长度
  api_key_prefix: "llm_"             # API Key 前缀
  
  # 数据隐私
  privacy_level: "metadata"           # none / metadata / masked / full
  data_retention_days: 30             # 数据保留天数
  auto_cleanup: true                  # 自动清理过期数据
  
  # 网络安全
  cors_origins:                       # 允许的域名
    - "http://localhost:3000"
    - "https://your-domain.com"
  rate_limit: 100                     # 每分钟请求数限制
  rate_limit_window: 60               # 限制窗口（秒）
  
  # 代理安全
  proxy_timeout: 30                   # 代理超时（秒）
  max_request_size: 10485760          # 最大请求体大小（10MB）
  mask_api_keys_in_logs: true         # 日志中脱敏 API Key
```

### 3.4 兼容性

- **Docker**：支持 amd64 和 arm64
- **操作系统**：Linux / macOS / Windows
- **浏览器**：Chrome / Firefox / Safari / Edge（最近 2 个版本）

---

## 4. 技术架构

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        LLM Lens                             │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Proxy Server │  │  API Server  │  │  Web UI      │     │
│  │  (Go/Rust)    │  │  (Python)    │  │  (Next.js)   │     │
│  │              │  │              │  │              │     │
│  │  - 转发请求   │  │  - REST API  │  │  - Dashboard │     │
│  │  - 采集数据   │  │  - 查询接口  │  │  - 图表      │     │
│  │  - 流式处理   │  │  - 告警      │  │  - 设置      │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │              │
│         └─────────────────┼─────────────────┘              │
│                           │                                │
│                    ┌──────┴───────┐                        │
│                    │   SQLite     │                        │
│                    │   Database   │                        │
│                    └──────────────┘                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Background Workers                                   │  │
│  │  - 数据聚合（每小时/每天）                             │  │
│  │  - 告警检查                                           │  │
│  │  - 数据清理（过期数据）                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 技术选型

| 组件 | 技术 | 理由 |
|------|------|------|
| **代理层** | Go | 高并发、低延迟、单二进制部署 |
| **API 层** | Python FastAPI | 你最熟，开发快 |
| **前端** | Next.js + TailwindCSS + Shadcn/ui | 现代、好看、组件丰富 |
| **数据库** | SQLite | 零依赖、单文件、够用 |
| **图表** | Recharts / Chart.js | React 生态成熟 |
| **部署** | Docker + docker-compose | 一行命令启动 |
| **CI/CD** | GitHub Actions | 开源项目标配 |

### 4.3 目录结构

```
llm-lens/
├── proxy/                    # Go 代理层
│   ├── main.go
│   ├── handler.go            # 请求转发 + 数据采集
│   ├── models.go             # 数据模型
│   ├── storage.go            # SQLite 存储层
│   └── pricing.go            # 模型定价计算
│
├── api/                      # Python API 层
│   ├── main.py               # FastAPI 入口
│   ├── routers/
│   │   ├── requests.py       # 请求查询接口
│   │   ├── analytics.py      # 分析统计接口
│   │   ├── alerts.py         # 告警接口
│   │   └── settings.py       # 设置接口
│   ├── models/
│   │   └── schemas.py        # Pydantic 模型
│   └── services/
│       ├── aggregation.py    # 数据聚合
│       ├── alerting.py       # 告警服务
│       └── export.py         # 数据导出
│
├── web/                      # Next.js 前端
│   ├── app/
│   │   ├── page.tsx          # 总览页
│   │   ├── requests/         # 请求列表 + 详情
│   │   ├── costs/            # 成本分析
│   │   ├── performance/      # 性能分析
│   │   ├── traces/           # Agent Trace
│   │   ├── dashboards/       # 看板系统
│   │   │   ├── page.tsx      # 看板列表
│   │   │   ├── [id]/         # 看板详情
│   │   │   └── components/   # 看板组件
│   │   └── settings/         # 设置
│   ├── components/
│   │   ├── charts/           # 图表组件
│   │   ├── tables/           # 表格组件
│   │   ├── dashboard/        # 看板专用组件
│   │   │   ├── DragDropLayout.tsx    # 拖拽布局引擎
│   │   │   ├── WidgetRegistry.tsx    # 组件注册中心
│   │   │   ├── NumberCard.tsx        # 数字卡片
│   │   │   ├── LineChart.tsx         # 折线图
│   │   │   ├── BarChart.tsx          # 柱状图
│   │   │   ├── PieChart.tsx          # 饼图
│   │   │   ├── Heatmap.tsx           # 热力图
│   │   │   ├── Ranking.tsx           # 排行榜
│   │   │   ├── Timeline.tsx          # 时间线
│   │   │   ├── AlertStream.tsx       # 告警流
│   │   │   ├── StatusLight.tsx       # 状态灯
│   │   │   └── MarkdownWidget.tsx    # Markdown 组件
│   │   └── ui/               # 基础 UI 组件
│   └── lib/
│       ├── api.ts            # API 客户端
│       └── dashboard.ts      # 看板配置管理
│
├── docker-compose.yml        # 一键部署
├── Dockerfile                # 构建镜像
├── README.md                 # 项目文档
├── LICENSE                   # MIT License
└── docs/
    ├── getting-started.md    # 快速开始
    ├── configuration.md      # 配置说明
    └── api-reference.md      # API 文档
```

### 4.4 看板系统实现方案

#### 技术要点

1. **布局引擎**：用 `react-grid-layout` 实现拖拽
2. **组件注册**：每个组件是独立的 React 组件，通过注册机制加载
3. **布局存储**：每个看板的布局存为 JSON（组件类型、位置、大小、配置）
4. **数据绑定**：组件通过 API 查询数据，支持自动刷新
5. **权限控制**：
   - 个人看板：只有自己能看到
   - 项目看板：项目成员可看，管理员可编辑
   - 大屏：可生成公开链接（只读）

#### 看板数据结构

```json
{
  "dashboard_id": "dash_abc123",
  "name": "我的看板",
  "type": "personal",  // personal / project / enterprise
  "layout": [
    {
      "i": "widget_1",
      "type": "number_card",
      "x": 0, "y": 0, "w": 3, "h": 2,
      "config": {
        "metric": "total_cost",
        "time_range": "today",
        "compare": "yesterday"
      }
    },
    {
      "i": "widget_2",
      "type": "line_chart",
      "x": 3, "y": 0, "w": 9, "h": 4,
      "config": {
        "metrics": ["request_count", "error_count"],
        "time_range": "7d",
        "group_by": "model"
      }
    }
  ],
  "auto_refresh": 10,
  "theme": "dark",
  "shared_link": null
}
```

#### 数据库表（看板相关）

```sql
-- 看板表
CREATE TABLE dashboards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,         -- personal / project / enterprise
    project_id TEXT,            -- 项目看板关联的项目 ID
    layout TEXT NOT NULL,       -- JSON: 组件布局配置
    auto_refresh INTEGER DEFAULT 10,
    theme TEXT DEFAULT 'dark',
    shared_link TEXT,           -- 公开分享链接（只读）
    created_by TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 看板权限表
CREATE TABLE dashboard_permissions (
    id TEXT PRIMARY KEY,
    dashboard_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,         -- viewer / editor / admin
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (dashboard_id) REFERENCES dashboards(id),
    UNIQUE(dashboard_id, user_id)
);

-- 索引
CREATE INDEX idx_dashboards_type ON dashboards(type);
CREATE INDEX idx_dashboards_project ON dashboards(project_id);
CREATE INDEX idx_dashboards_created_by ON dashboards(created_by);
CREATE INDEX idx_dashboard_permissions_user ON dashboard_permissions(user_id);
```

#### API 接口（看板相关）

```
GET    /api/dashboards              → 看板列表
POST   /api/dashboards              → 创建看板
GET    /api/dashboards/:id          → 看板详情（含布局配置）
PUT    /api/dashboards/:id          → 更新看板（布局、名称、设置）
DELETE /api/dashboards/:id          → 删除看板
POST   /api/dashboards/:id/share    → 生成公开分享链接
DELETE /api/dashboards/:id/share    → 取消分享
GET    /api/dashboards/shared/:link → 获取公开看板（只读）
POST   /api/dashboards/:id/widgets  → 添加组件
PUT    /api/dashboards/:id/widgets/:widget_id → 更新组件配置
DELETE /api/dashboards/:id/widgets/:widget_id → 删除组件
```

### 4.5 数据库设计

```sql
-- 请求记录表
CREATE TABLE requests (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    model TEXT NOT NULL,
    provider TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    cost_usd REAL,
    latency_ms INTEGER,
    ttft_ms INTEGER,
    status_code INTEGER,
    is_error INTEGER DEFAULT 0,
    error_message TEXT,
    stream INTEGER DEFAULT 0,
    user_id TEXT,
    tags TEXT,              -- JSON array
    metadata TEXT,          -- JSON object
    request_body TEXT,      -- 可选，脱敏后存储
    response_body TEXT,     -- 可选，脱敏后存储
    trace_id TEXT,          -- Agent Trace ID
    parent_span_id TEXT,    -- 父 Span ID（用于 Trace 树）
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 每小时聚合表（加速查询）
CREATE TABLE hourly_stats (
    hour INTEGER NOT NULL,      -- Unix timestamp (小时)
    model TEXT NOT NULL,
    request_count INTEGER,
    total_tokens INTEGER,
    total_cost_usd REAL,
    avg_latency_ms INTEGER,
    p95_latency_ms INTEGER,
    error_count INTEGER,
    PRIMARY KEY (hour, model)
);

-- 告警规则表
CREATE TABLE alert_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,         -- error_rate / latency / cost / tokens
    threshold REAL NOT NULL,
    model TEXT,                 -- NULL = 所有模型
    channel TEXT NOT NULL,      -- webhook / slack / email / feishu
    channel_config TEXT NOT NULL, -- JSON: webhook URL 等
    enabled INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 告警历史表
CREATE TABLE alert_history (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL,
    triggered_at INTEGER NOT NULL,
    value REAL,
    message TEXT,
    resolved_at INTEGER,
    FOREIGN KEY (rule_id) REFERENCES alert_rules(id)
);

-- 索引
CREATE INDEX idx_requests_timestamp ON requests(timestamp);
CREATE INDEX idx_requests_model ON requests(model);
CREATE INDEX idx_requests_user_id ON requests(user_id);
CREATE INDEX idx_requests_trace_id ON requests(trace_id);
CREATE INDEX idx_requests_is_error ON requests(is_error);
```

---

## 5. API 设计

### 5.1 代理 API（转发层）

```
POST /v1/chat/completions       → 转发到 OpenAI / Claude / DeepSeek
POST /v1/completions            → 转发到 OpenAI
POST /v1/embeddings             → 转发到 OpenAI
POST /v1/images/generations     → 转发到 OpenAI
```

### 5.2 管理 API

```
GET    /api/overview            → 总览数据
GET    /api/requests            → 请求列表（分页、筛选）
GET    /api/requests/:id        → 请求详情
GET    /api/costs               → 成本分析
GET    /api/performance         → 性能分析
GET    /api/traces              → Trace 列表
GET    /api/traces/:id          → Trace 详情（含所有 Span）
GET    /api/alerts              → 告警规则列表
POST   /api/alerts              → 创建告警规则
PUT    /api/alerts/:id          → 更新告警规则
DELETE /api/alerts/:id          → 删除告警规则
GET    /api/alerts/history      → 告警历史
GET    /api/settings            → 获取设置
PUT    /api/settings            → 更新设置
GET    /api/export              → 导出数据（JSON/CSV）
POST   /api/auth/keys           → 创建 API Key
DELETE /api/auth/keys/:id       → 删除 API Key
```

#### 看板 API

```
GET    /api/dashboards              → 看板列表
POST   /api/dashboards              → 创建看板
GET    /api/dashboards/:id          → 看板详情（含布局配置）
PUT    /api/dashboards/:id          → 更新看板（布局、名称、设置）
DELETE /api/dashboards/:id          → 删除看板
POST   /api/dashboards/:id/share    → 生成公开分享链接
DELETE /api/dashboards/:id/share    → 取消分享
GET    /api/dashboards/shared/:link → 获取公开看板（只读）
POST   /api/dashboards/:id/widgets  → 添加组件
PUT    /api/dashboards/:id/widgets/:widget_id → 更新组件配置
DELETE /api/dashboards/:id/widgets/:widget_id → 删除组件
```

### 5.3 WebSocket（实时）

```
WS /api/ws/requests            → 实时请求流（Dashboard 最近请求）
```

---

## 6. 开发路线图

### Phase 1：MVP（4-6 周）
- [ ] Go 代理层：OpenAI API 转发 + 数据采集
- [ ] SQLite 存储层
- [ ] Python API：基础查询接口
- [ ] Next.js Dashboard：总览页 + 请求列表 + 请求详情
- [ ] Docker 一键部署
- [ ] README + 快速开始文档

### Phase 2：核心功能（2-4 周）
- [ ] 成本分析页
- [ ] 性能分析页
- [ ] 多模型支持（Claude、DeepSeek）
- [ ] 用户维度分析
- [ ] 数据导出

### Phase 3：看板系统（2-4 周）
- [ ] 个人看板（默认组件布局）
- [ ] 可拖拽组件库（数字卡片、折线图、柱状图、饼图）
- [ ] 看板分享（公开链接）
- [ ] 项目看板（团队协作）
- [ ] 企业大屏（全屏模式）
- [ ] 组件注册中心（热力图、排行榜、时间线等）

### Phase 4：差异化（2-4 周）
- [ ] Agent Trace（追踪 + 可视化）
- [ ] 告警系统
- [ ] 自定义模型定价
- [ ] 数据保留策略

### Phase 5：社区（持续）
- [ ] 开源社区建设
- [ ] Product Hunt Launch
- [ ] 文档完善
- [ ] 插件/集成（LangChain、LlamaIndex、Dify）

---

## 7. 竞品对比（最终版）

| 特性 | LLM Lens | Langfuse | Helicone | LangSmith |
|------|----------|----------|----------|-----------|
| **价格** | 完全免费 | 免费自部署，云版 $59/月 | Pro $20/座/月 | Plus $39/座/月 |
| **自部署** | 一行 docker run | 需要 ClickHouse | 需要代理服务 | 不支持自部署 |
| **接入方式** | 改 base_url | SDK / 改 base_url | 改 base_url | SDK（绑定 LangChain） |
| **Agent Trace** | ✅ 专门做 | ⚠️ 基础 | ❌ | ⚠️ 基础 |
| **存储** | SQLite（零依赖） | ClickHouse + PostgreSQL | 云端 | 云端 |
| **目标用户** | 独立开发者 | 企业 | 企业+开发者 | LangChain 用户 |
| **开源协议** | MIT | MIT（部分） | Apache 2.0 | ❌ 不开源 |

---

## 8. 命名与品牌

### 产品名称：**LLM Lens**
- **含义**：Lens = 透镜，让用户透过它看清 LLM 的运行状态
- **域名建议**：llmlens.dev / llmlens.io / llmlens.ai
- **GitHub**：github.com/Howard-Soap/llm-lens

### Logo 概念
- 一个简洁的透镜/放大镜图标
- 主色调：深蓝/紫色（专业感）+ 绿色（健康/监控）
- 暗色主题为主（开发者友好）

### Slogan
> **"See your LLM clearly."**
> 或中文版：**"让 LLM 一目了然。"**

---

## 9. 成功指标

| 指标 | 3 个月目标 | 6 个月目标 | 12 个月目标 |
|------|-----------|-----------|------------|
| GitHub Stars | 500 | 2,000 | 5,000 |
| 月活用户 | 100 | 500 | 2,000 |
| Docker 拉取 | 1,000 | 5,000 | 20,000 |
| 社区贡献者 | 5 | 15 | 30 |
| Product Hunt 排名 | Top 10 | - | - |

---

## 附录

### A. 术语表

| 术语 | 说明 |
|------|------|
| LLM | 大语言模型（Large Language Model） |
| Token | LLM 处理文本的基本单位 |
| TTFT | 首 Token 延迟（Time to First Token） |
| Trace | 一次完整请求的追踪链路 |
| Span | Trace 中的一个步骤 |
| P50/P95/P99 | 延迟的百分位数 |
| RPM | 每分钟请求数（Requests Per Minute） |

### B. 参考项目

- [Langfuse](https://langfuse.com/) — 开源 LLM 工程平台
- [Helicone](https://helicone.ai/) — LLM 可观测性
- [Arize Phoenix](https://phoenix.arize.com/) — 开源 AI 可观测性
- [PostHog](https://posthog.com/) — 开源产品分析（商业模式参考）
- [Plausible Analytics](https://plausible.io/) — 开源网站分析（定价策略参考）
