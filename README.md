<div align="center">

# 🔍 LLM Lens

### See your LLM clearly.

**开源、免费、零依赖的 LLM 可观测性工具**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/Howard-Soap/llm-lens.svg)](https://github.com/Howard-Soap/llm-lens)
[![GitHub Forks](https://img.shields.io/github/forks/Howard-Soap/llm-lens.svg)](https://github.com/Howard-Soap/llm-lens)
[![Docker Pulls](https://img.shields.io/docker/pulls/llmlens/llm-lens.svg)](https://hub.docker.com/r/llmlens/llm-lens)

[English](#english) | [中文](#中文)

</div>

---

<a name="中文"></a>

## 🇨🇳 中文

### 🌟 我是小白，怎么用？

**你只需要 3 步，全程不超过 5 分钟：**

#### 第 1 步：安装（1 分钟）

打开终端（Mac 按 `Cmd+空格` 输入"终端"，Windows 搜索"PowerShell"），粘贴下面的命令，回车：

```bash
curl -fsSL https://raw.githubusercontent.com/Howard-Soap/llm-lens/main/install.sh | bash
```

> 💡 如果你还没装 Docker，脚本会自动提示你怎么装，跟着做就行。

等它跑完，看到 **"🎉 LLM Lens 安装成功！"** 就行了。

#### 第 2 步：打开网页（10 秒）

浏览器打开 **http://localhost:3000**

你会看到一个漂亮的监控面板 🎉

#### 第 3 步：接入你的应用（2 分钟）

如果你用 Python 调 OpenAI API，**只需要加一行代码**：

```python
import openai

# 改之前 👇
client = openai.OpenAI(api_key="sk-xxx")

# 改之后 👇（加一行 base_url）
client = openai.OpenAI(
    api_key="sk-xxx",
    base_url="http://localhost:3000/v1"  # ← 加这一行
)
```

其他代码完全不用改！运行你的程序，回到网页刷新，就能看到数据了。

> 📖 零基础教程：[docs/tutorial-for-beginners.md](docs/tutorial-for-beginners.md)
> ❓ 遇到问题？看这里：[docs/FAQ.md](docs/FAQ.md)

---

### ✨ 为什么选择 LLM Lens？

| 特性 | LLM Lens | Langfuse | Helicone | LangSmith |
|------|----------|----------|----------|-----------|
| **价格** | 🆓 完全免费 | 免费自部署，云版 $59/月 | Pro $20/座/月 | Plus $39/座/月 |
| **自部署** | 🐳 一行 docker run | ❌ 需要 ClickHouse | ❌ 需要代理服务 | ❌ 不支持 |
| **接入方式** | 📝 改 base_url | SDK / 改 base_url | 改 base_url | SDK（绑定 LangChain） |
| **Agent Trace** | ✅ 专门做 | ⚠️ 基础 | ❌ | ⚠️ 基础 |
| **看板系统** | ✅ 可拖拽 | ❌ 固定 | ❌ 固定 | ❌ 固定 |
| **存储** | 📦 SQLite（零依赖） | ❌ ClickHouse + PostgreSQL | ☁️ 云端 | ☁️ 云端 |
| **开源协议** | 📄 MIT | MIT（部分） | Apache 2.0 | ❌ 不开源 |

### 🚀 快速开始

#### 1. 一行命令启动

```bash
docker run -d \
  --name llm-lens \
  -p 3000:3000 \
  -v llm-lens-data:/data \
  llmlens/llm-lens:latest
```

或者用一键安装脚本：

```bash
curl -fsSL https://raw.githubusercontent.com/Howard-Soap/llm-lens/main/install.sh | bash
```

#### 2. 接入你的应用（只需改一行）

```python
import openai

client = openai.OpenAI(
    api_key="sk-your-api-key",
    base_url="http://localhost:3000/v1"  # ← 改这一行
)

# 其他代码完全不用改！
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

```javascript
// JavaScript/TypeScript
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'sk-your-api-key',
  baseURL: 'http://localhost:3000/v1'  // ← 改这一行
})
```

#### 3. 打开 Dashboard

浏览器访问 `http://localhost:3000`

### 🎯 核心功能

#### 📊 可视化看板
- **可拖拽布局**：Notion 风格，自由排列组件
- **12 种组件**：数字卡片、折线图、柱状图、饼图、热力图等
- **3 种模板**：个人、团队、企业大屏
- **全屏模式**：适合投屏展示

#### 💰 成本追踪
- **按模型**：每个模型花了多少钱
- **按用户**：每个用户/API Key 的成本
- **按时间**：日/周/月成本趋势

#### ⚡ 性能监控
- **延迟分布**：P50 / P95 / P99
- **首 Token 延迟**：流式响应的关键指标
- **错误率**：实时监控，异常告警

#### 🔗 Agent Trace
- **多步推理链**：可视化 Agent 的思考过程
- **成本归因**：每一步花了多少 token
- **时间轴视图**：直观展示各步骤耗时

#### 🔒 安全第一
- ✅ API Key 不存储原文，只在内存中转发
- ✅ 日志自动脱敏（只显示后四位）
- ✅ 4 级隐私设置
- ✅ 本地优先，数据不出本机

### 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        LLM Lens                             │
│                                                             │
│  用户代码 ──→ Proxy (Go) ──→ OpenAI / Claude / DeepSeek   │
│                    ↓                                        │
│              记录请求元数据                                  │
│                    ↓                                        │
│              SQLite 存储                                    │
│                    ↓                                        │
│         API (Python) ──→ Dashboard (Next.js)               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

| 组件 | 技术 | 说明 |
|------|------|------|
| **代理层** | Go | 高并发、低延迟、单二进制 |
| **API 层** | Python FastAPI | REST API + 数据分析 |
| **前端** | Next.js + TailwindCSS | 可拖拽看板 |
| **存储** | SQLite | 零依赖、单文件 |
| **部署** | Docker | 一行命令启动 |

### 📦 支持的模型

| 提供商 | 模型 | 状态 |
|--------|------|------|
| **OpenAI** | GPT-4, GPT-4o, GPT-3.5 Turbo | ✅ |
| **Anthropic** | Claude 3 Opus/Sonnet/Haiku | ✅ |
| **DeepSeek** | DeepSeek Chat, DeepSeek Coder | ✅ |
| **Ollama** | Llama, Mistral, CodeLlama | ✅ |
| **本地模型** | 任何兼容 OpenAI API 的模型 | ✅ |

### 📚 文档

- [📖 零基础教程](docs/tutorial-for-beginners.md) — 完全不懂代码也能看懂
- [🚀 快速开始](docs/getting-started.md) — 5 分钟上手
- [⚙️ 配置说明](docs/configuration.md) — 进阶配置
- [❓ 常见问题](docs/FAQ.md) — 遇到问题先看这里

### 🤝 贡献

欢迎贡献！请查看 [贡献指南](docs/CONTRIBUTING.md)

<a name="english"></a>

---

## 🇺🇸 English

### 🌟 New to LLM Lens?

**Just 3 steps, under 5 minutes:**

#### Step 1: Install (1 minute)

Open your terminal and paste:

```bash
curl -fsSL https://raw.githubusercontent.com/Howard-Soap/llm-lens/main/install.sh | bash
```

> 💡 Don't have Docker? The script will guide you through installing it.

Wait for **"🎉 LLM Lens installed successfully!"**

#### Step 2: Open the dashboard (10 seconds)

Visit **http://localhost:3000** in your browser.

#### Step 3: Connect your app (2 minutes)

Just add one line to your code:

```python
client = openai.OpenAI(
    api_key="sk-xxx",
    base_url="http://localhost:3000/v1"  # ← add this line
)
```

That's it! Run your code, refresh the dashboard, and see your data.

> 📖 Beginner tutorial: [docs/tutorial-for-beginners.md](docs/tutorial-for-beginners.md)
> ❓ Questions? Check: [docs/FAQ.md](docs/FAQ.md)

---

### ✨ Why LLM Lens?

| Feature | LLM Lens | Langfuse | Helicone | LangSmith |
|---------|----------|----------|----------|-----------|
| **Price** | 🆓 Free forever | Free self-host, $59/mo cloud | Pro $20/seat/mo | Plus $39/seat/mo |
| **Self-host** | 🐳 One docker run | ❌ Needs ClickHouse | ❌ Needs proxy | ❌ Not supported |
| **Integration** | 📝 Change base_url | SDK / change base_url | Change base_url | SDK (LangChain only) |
| **Agent Trace** | ✅ Dedicated | ⚠️ Basic | ❌ | ⚠️ Basic |
| **Dashboard** | ✅ Drag & drop | ❌ Fixed | ❌ Fixed | ❌ Fixed |
| **Storage** | 📦 SQLite (zero dep) | ❌ ClickHouse + PostgreSQL | ☁️ Cloud | ☁️ Cloud |
| **License** | 📄 MIT | MIT (partial) | Apache 2.0 | ❌ Proprietary |

### 🚀 Quick Start

#### 1. One command to start

```bash
docker run -d \
  --name llm-lens \
  -p 3000:3000 \
  -v llm-lens-data:/data \
  llmlens/llm-lens:latest
```

Or use the one-click install script:

```bash
curl -fsSL https://raw.githubusercontent.com/Howard-Soap/llm-lens/main/install.sh | bash
```

#### 2. Integrate your app (one line change)

```python
import openai

client = openai.OpenAI(
    api_key="sk-your-api-key",
    base_url="http://localhost:3000/v1"  # ← Change this line
)

# No other changes needed!
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

```javascript
// JavaScript/TypeScript
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'sk-your-api-key',
  baseURL: 'http://localhost:3000/v1'  // ← Change this line
})
```

#### 3. Open Dashboard

Visit `http://localhost:3000` in your browser

### 🎯 Core Features

#### 📊 Visual Dashboard
- **Drag & drop layout**: Notion-style, arrange components freely
- **12 widget types**: Number cards, line charts, bar charts, pie charts, heatmaps, etc.
- **3 templates**: Personal, Team, Enterprise
- **Fullscreen mode**: Perfect for presentations

#### 💰 Cost Tracking
- **By model**: How much each model costs
- **By user**: Cost per user/API key
- **By time**: Daily/weekly/monthly trends

#### ⚡ Performance Monitoring
- **Latency distribution**: P50 / P95 / P99
- **Time to First Token**: Key metric for streaming
- **Error rate**: Real-time monitoring with alerts

#### 🔗 Agent Trace
- **Multi-step reasoning**: Visualize agent's thought process
- **Cost attribution**: How many tokens per step
- **Timeline view**: See where time is spent

#### 🔒 Security First
- ✅ API keys never stored, only forwarded in memory
- ✅ Logs auto-sanitized (show last 4 chars only)
- ✅ 4 privacy levels
- ✅ Local-first, data never leaves your machine

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        LLM Lens                             │
│                                                             │
│  User Code ──→ Proxy (Go) ──→ OpenAI / Claude / DeepSeek   │
│                    ↓                                        │
│              Record request metadata                        │
│                    ↓                                        │
│              SQLite storage                                 │
│                    ↓                                        │
│         API (Python) ──→ Dashboard (Next.js)               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

| Component | Technology | Description |
|-----------|------------|-------------|
| **Proxy** | Go | High concurrency, low latency, single binary |
| **API** | Python FastAPI | REST API + data analysis |
| **Frontend** | Next.js + TailwindCSS | Drag & drop dashboard |
| **Storage** | SQLite | Zero dependencies, single file |
| **Deploy** | Docker | One command to start |

### 📦 Supported Models

| Provider | Models | Status |
|----------|--------|--------|
| **OpenAI** | GPT-4, GPT-4o, GPT-3.5 Turbo | ✅ |
| **Anthropic** | Claude 3 Opus/Sonnet/Haiku | ✅ |
| **DeepSeek** | DeepSeek Chat, DeepSeek Coder | ✅ |
| **Ollama** | Llama, Mistral, CodeLlama | ✅ |
| **Local** | Any OpenAI API compatible model | ✅ |

### 📚 Documentation

- [📖 Beginner Tutorial](docs/tutorial-for-beginners.md) — No coding experience needed
- [🚀 Quick Start](docs/getting-started.md) — Get running in 5 minutes
- [⚙️ Configuration](docs/configuration.md) — Advanced settings
- [❓ FAQ](docs/FAQ.md) — Common issues and solutions

### 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](docs/CONTRIBUTING.md)

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

<div align="center">

**Made with ❤️ by [Howard-Soap](https://github.com/Howard-Soap)**

[GitHub](https://github.com/Howard-Soap/llm-lens) · [Documentation](docs/) · [Issues](https://github.com/Howard-Soap/llm-lens/issues)

</div>
