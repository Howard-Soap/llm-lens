# 🔍 LLM Lens

> **See your LLM clearly.** — 开源、免费、零依赖的 LLM 可观测性工具

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://hub.docker.com/r/llmlens/llm-lens)
[![GitHub Stars](https://img.shields.io/github/stars/Howard-Soap/llm-lens.svg)](https://github.com/Howard-Soap/llm-lens)

---

## ✨ 特性

- 🚀 **一行代码接入** — 只需改 `base_url`，不需要安装 SDK
- 🐳 **一键部署** — `docker run` 启动，不需要外部数据库
- 💰 **成本追踪** — 按模型/用户/时间维度分析 LLM 费用
- 📊 **可视化看板** — 可拖拽的 Notion 风格 Dashboard
- 🔗 **Agent Trace** — 多步推理链可视化（Coming Soon）
- 🔒 **安全第一** — API Key 不存储、日志脱敏、本地优先
- 🆓 **完全免费** — MIT 开源，无付费功能

## 🚀 快速开始

### Docker 一键部署

```bash
docker run -d \
  --name llm-lens \
  -p 3000:3000 \
  -v llm-lens-data:/data \
  llmlens/llm-lens:latest
```

### 接入你的应用

只需修改 `base_url`：

```python
import openai

client = openai.OpenAI(
    api_key="sk-your-api-key",
    base_url="http://localhost:3000/v1"  # ← 改这一行
)

# 其他代码完全不用改
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### 访问 Dashboard

打开浏览器访问 `http://localhost:3000`

## 📊 功能截图

```
┌─────────────────────────────────────────────────────────────┐
│  LLM Lens — Dashboard                                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 总请求    │ │ 总成本    │ │ 平均延迟  │ │ 错误率    │      │
│  │ 12,345   │ │ $45.67   │ │ 234ms    │ │ 0.3%     │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  [成本趋势图]  [模型分布]  [最近请求列表]                     │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ 技术架构

```
用户代码 → LLM Lens Proxy (Go) → OpenAI / Claude / DeepSeek
              ↓
         记录请求/响应/延迟/token/成本
              ↓
         SQLite 存储
              ↓
         Python API (FastAPI) → Next.js Dashboard
```

| 组件 | 技术 | 说明 |
|------|------|------|
| 代理层 | Go | 高并发、低延迟、单二进制 |
| API 层 | Python FastAPI | REST API + 数据分析 |
| 前端 | Next.js + TailwindCSS | 可拖拽看板 |
| 存储 | SQLite | 零依赖、单文件 |
| 部署 | Docker | 一行命令启动 |

## 📁 项目结构

```
llm-lens/
├── proxy/              # Go 代理层
├── api/                # Python API 层
├── web/                # Next.js 前端
├── docker-compose.yml  # 一键部署
├── Dockerfile          # 构建镜像
├── PRD.md              # 产品需求文档
└── docs/               # 文档
```

## 🔒 安全

- ✅ API Key 不存储原文，只在内存中转发
- ✅ 日志自动脱敏（只显示后四位）
- ✅ 支持 4 级隐私设置（不记录 / 元数据 / 脱敏 / 完整）
- ✅ 本地优先，数据不出本机
- ✅ Docker 非 root 运行

## 🗺️ 路线图

- [x] MVP：代理转发 + 基础 Dashboard
- [ ] 多模型支持（Claude、DeepSeek）
- [ ] 可拖拽看板系统
- [ ] Agent Trace 可视化
- [ ] 告警系统
- [ ] 移动端 App

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](docs/CONTRIBUTING.md)

## 📄 许可证

MIT License — 详见 [LICENSE](LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Howard-Soap">Howard-Soap</a>
</p>
