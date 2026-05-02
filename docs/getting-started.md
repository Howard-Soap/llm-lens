# 🚀 快速开始

本指南将帮助你在 5 分钟内启动 LLM Lens 并开始监控你的 LLM 应用。

## 前置要求

- Docker 和 Docker Compose（推荐）
- 或者：Go 1.22+、Python 3.10+、Node.js 18+（本地开发）

## 方式一：Docker 一键部署（推荐）

### 1. 克隆项目

```bash
git clone https://github.com/Howard-Soap/llm-lens.git
cd llm-lens
```

### 2. 启动服务

```bash
# 生产环境
docker-compose up -d

# 开发环境（支持热重载）
docker-compose -f docker-compose.yml -f docker-compose.override.yml up
```

### 3. 访问服务

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:8000
- **代理**: http://localhost:3000/v1

### 4. 接入你的应用

修改你的 LLM 客户端的 `base_url`：

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

```javascript
// JavaScript/TypeScript
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'sk-your-api-key',
  baseURL: 'http://localhost:3000/v1'  // ← 改这一行
})
```

```bash
# cURL
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-your-api-key" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 5. 查看数据

打开 Dashboard (http://localhost:3000)，你将看到：
- 请求总数、总成本、平均延迟、错误率
- 成本趋势图
- 模型分布
- 最近请求列表

## 方式二：本地开发

### 1. 启动 Go 代理层

```bash
cd proxy

# 安装依赖
go mod tidy

# 编译
go build -o llm-lens-proxy .

# 运行
./llm-lens-proxy -port 3000 -db ../data/llm-lens.db
```

### 2. 启动 Python API

```bash
cd api

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate   # Windows

# 安装依赖
pip install -r requirements.txt

# 运行
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. 启动 Next.js 前端

```bash
cd web

# 安装依赖
npm install

# 运行开发服务器
npm run dev
```

### 4. 访问服务

- **Dashboard**: http://localhost:3001
- **API**: http://localhost:8000
- **代理**: http://localhost:3000/v1

## 配置说明

### 环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

主要配置项：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `LLM_LENS_PROXY_PORT` | 代理端口 | 3000 |
| `LLM_LENS_API_PORT` | API 端口 | 8000 |
| `LLM_LENS_DB_PATH` | 数据库路径 | /data/llm-lens.db |
| `LLM_LENS_PRIVACY_LEVEL` | 隐私级别 | metadata |
| `LLM_LENS_DATA_RETENTION_DAYS` | 数据保留天数 | 30 |

### 隐私级别

| 级别 | 说明 |
|------|------|
| `none` | 不记录任何内容 |
| `metadata` | 只记录元数据（token、延迟、成本） |
| `masked` | 记录脱敏内容（隐藏 API Key 等敏感信息） |
| `full` | 完整记录（用于调试） |

## 常见问题

### Q: 如何查看日志？

```bash
# Docker 环境
docker-compose logs -f proxy
docker-compose logs -f api

# 本地开发
# Go 代理层日志直接输出到终端
# Python API 日志在 uvicorn 输出
```

### Q: 如何备份数据？

```bash
# Docker 环境
docker cp llm-lens-proxy:/data/llm-lens.db ./backup/

# 本地开发
cp data/llm-lens.db ./backup/
```

### Q: 如何重置数据？

```bash
# 停止服务
docker-compose down

# 删除数据卷
docker volume rm llm-lens_llm-lens-data

# 重新启动
docker-compose up -d
```

### Q: 如何使用自定义域名？

1. 修改 `nginx/nginx.conf` 中的 `server_name`
2. 添加 SSL 证书到 `nginx/ssl/`
3. 启用 nginx profile：

```bash
docker-compose --profile with-nginx up -d
```

### Q: 如何支持 Claude/DeepSeek？

LLM Lens 自动识别模型提供商：
- `gpt-*` → OpenAI
- `claude-*` → Anthropic
- `deepseek-*` → DeepSeek

只需在请求中指定正确的模型名称即可。

## 下一步

- 📖 查看 [PRD.md](../PRD.md) 了解完整功能规划
- 🔧 查看 [配置说明](./configuration.md) 了解高级配置
- 📊 查看 [API 文档](./api-reference.md) 了解接口详情
- 🤝 查看 [贡献指南](./CONTRIBUTING.md) 参与项目开发

## 获取帮助

- 📧 Email: your-email@example.com
- 💬 GitHub Issues: https://github.com/Howard-Soap/llm-lens/issues
- 📖 文档: https://github.com/Howard-Soap/llm-lens/tree/main/docs
