# ⚙️ 配置说明

本文档详细介绍 LLM Lens 的所有配置选项。

## 环境变量

### 代理层配置

| 变量 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `LLM_LENS_PROXY_PORT` | 代理监听端口 | 3000 | 3000 |
| `LLM_LENS_DB_PATH` | SQLite 数据库路径 | /data/llm-lens.db | ./data/llm-lens.db |
| `LLM_LENS_LOG_LEVEL` | 日志级别 | info | debug, info, warn, error |
| `LLM_LENS_PROXY_TIMEOUT` | 代理超时（秒） | 60 | 30 |
| `LLM_LENS_MAX_REQUEST_BODY_SIZE` | 最大请求体大小（字节） | 10485760 | 5242880 |

### API 层配置

| 变量 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `LLM_LENS_API_PORT` | API 监听端口 | 8000 | 8001 |
| `LLM_LENS_DB_PATH` | SQLite 数据库路径 | /data/llm-lens.db | ./data/llm-lens.db |

### 前端配置

| 变量 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `NEXT_PUBLIC_API_URL` | API 地址 | http://localhost:8000 | http://api:8000 |
| `PORT` | 前端端口 | 3000 | 3001 |

### 安全配置

| 变量 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `LLM_LENS_LOCAL_MODE` | 本地模式（跳过认证） | true | false |
| `LLM_LENS_SECRET_KEY` | Session 密钥 | - | your-secret-key |
| `LLM_LENS_CORS_ORIGINS` | CORS 允许的域名 | * | http://localhost:3000 |
| `LLM_LENS_RATE_LIMIT` | Rate Limit（每分钟） | 100 | 50 |

### 数据隐私配置

| 变量 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `LLM_LENS_PRIVACY_LEVEL` | 隐私级别 | metadata | none, metadata, masked, full |
| `LLM_LENS_DATA_RETENTION_DAYS` | 数据保留天数 | 30 | 7, 30, 90, 365 |
| `LLM_LENS_MASK_API_KEYS` | 是否脱敏 API Key | true | false |

## 隐私级别详解

### none
不记录任何请求/响应内容。只记录请求数量和时间戳。

适用场景：对隐私要求极高的生产环境。

### metadata（推荐）
只记录元数据：
- 请求 ID
- 时间戳
- 模型名称
- Token 用量
- 延迟
- 成本
- 状态码

适用场景：大多数生产环境，平衡隐私和可观测性。

### masked
记录元数据 + 脱敏后的请求/响应内容：
- 自动隐藏 API Key（`sk-***`）
- 自动隐藏邮箱（`***@***.***`）
- 自动隐藏手机号（`1**********`）

适用场景：需要调试请求内容，但不想暴露敏感信息。

### full
完整记录所有内容。包括：
- 完整的请求体
- 完整的响应体
- 所有元数据

适用场景：开发和调试环境。

## Docker 配置

### docker-compose.yml

```yaml
services:
  proxy:
    image: llmlens/llm-lens-proxy:latest
    ports:
      - "127.0.0.1:3000:3000"  # 只监听本地
    volumes:
      - llm-lens-data:/data
    environment:
      - LLM_LENS_DB_PATH=/data/llm-lens.db
    restart: unless-stopped
    # 安全配置
    user: "1000:1000"  # 非 root 运行
    read_only: true     # 只读文件系统
    security_opt:
      - no-new-privileges:true
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  api:
    image: llmlens/llm-lens-api:latest
    ports:
      - "127.0.0.1:8000:8000"
    volumes:
      - llm-lens-data:/data
    environment:
      - LLM_LENS_DB_PATH=/data/llm-lens.db
    restart: unless-stopped

  web:
    image: llmlens/llm-lens-web:latest
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:8000
    depends_on:
      - api
    restart: unless-stopped

volumes:
  llm-lens-data:
    driver: local
```

### Nginx 配置

如果需要使用自定义域名或 HTTPS，启用 nginx profile：

```bash
docker-compose --profile with-nginx up -d
```

修改 `nginx/nginx.conf`：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # ... 其他配置
}
```

## 数据库配置

### SQLite 配置

LLM Lens 使用 SQLite 作为数据库，支持以下配置：

```sql
-- 启用 WAL 模式（提高并发性能）
PRAGMA journal_mode=WAL;

-- 设置缓存大小
PRAGMA cache_size=-64000;  -- 64MB

-- 启用外键约束
PRAGMA foreign_keys=ON;

-- 设置同步模式
PRAGMA synchronous=NORMAL;
```

### 数据保留策略

自动清理过期数据：

```sql
-- 删除 30 天前的数据
DELETE FROM requests WHERE timestamp < strftime('%s', 'now') - 30 * 86400;
```

配置保留天数：
```bash
LLM_LENS_DATA_RETENTION_DAYS=30
```

## 模型定价配置

LLM Lens 内置了常见模型的定价，如果需要自定义：

编辑 `proxy/pricing.go`：

```go
var ModelPricingMap = map[string]ModelPricing{
    "your-model": {
        Model:            "your-model",
        InputPricePer1K:  0.001,   // 每 1K 输入 token 的价格（美元）
        OutputPricePer1K: 0.002,   // 每 1K 输出 token 的价格（美元）
    },
}
```

## 性能调优

### 代理层

```bash
# 增加最大连接数
LLM_LENS_MAX_CONNECTIONS=1000

# 调整超时
LLM_LENS_PROXY_TIMEOUT=30

# 启用连接池
LLM_LENS_ENABLE_CONNECTION_POOL=true
```

### API 层

```bash
# 增加 worker 数量
uvicorn api.main:app --workers 4

# 启用缓存
LLM_LENS_ENABLE_CACHE=true
LLM_LENS_CACHE_TTL=60
```

### 数据库

```sql
-- 创建索引
CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);
CREATE INDEX IF NOT EXISTS idx_requests_model ON requests(model);
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);

-- 定期优化
VACUUM;
ANALYZE;
```

## 监控和告警

### 健康检查

```bash
# 代理层
curl http://localhost:3000/health

# API 层
curl http://localhost:8000/health
```

### 日志配置

```bash
# 日志级别
LLM_LENS_LOG_LEVEL=info  # debug, info, warn, error

# 日志格式
LLM_LENS_LOG_FORMAT=json  # json, text
```

### 告警配置（TODO）

```yaml
alerts:
  error_rate:
    threshold: 5  # 错误率超过 5%
    window: 5m    # 5 分钟窗口
    channels:
      - slack
      - email
  
  latency:
    threshold: 5000  # P95 延迟超过 5s
    window: 5m
    channels:
      - slack
  
  cost:
    threshold: 100  # 日成本超过 $100
    window: 24h
    channels:
      - email
```

## 故障排查

### 常见问题

1. **代理无法启动**
   - 检查端口是否被占用：`lsof -i :3000`
   - 检查数据库路径是否可写
   - 查看日志：`docker-compose logs proxy`

2. **API 返回 500**
   - 检查数据库是否正常
   - 查看 API 日志：`docker-compose logs api`
   - 检查环境变量配置

3. **前端无法访问 API**
   - 检查 `NEXT_PUBLIC_API_URL` 配置
   - 检查 CORS 配置
   - 检查网络连接

4. **数据不显示**
   - 检查代理是否正常转发
   - 检查数据库是否有数据
   - 检查隐私级别设置

### 调试模式

```bash
# 启用调试日志
LLM_LENS_LOG_LEVEL=debug

# 查看详细日志
docker-compose logs -f proxy
docker-compose logs -f api
```

## 安全建议

1. **生产环境**
   - 设置 `LLM_LENS_LOCAL_MODE=false`
   - 使用强密码的 `LLM_LENS_SECRET_KEY`
   - 配置 HTTPS
   - 限制 CORS 域名
   - 启用 Rate Limiting

2. **数据安全**
   - 定期备份数据库
   - 设置合理的数据保留策略
   - 使用 `masked` 或 `metadata` 隐私级别

3. **网络安全**
   - 只监听本地端口（`127.0.0.1`）
   - 使用防火墙限制访问
   - 配置 VPN 或 SSH 隧道

## 更新和升级

### 更新镜像

```bash
# 拉取最新镜像
docker-compose pull

# 重启服务
docker-compose up -d
```

### 数据库迁移

```bash
# 备份数据
docker cp llm-lens-proxy:/data/llm-lens.db ./backup/

# 更新后重启
docker-compose down
docker-compose up -d
```
