# Go 代理层 Dockerfile
FROM golang:1.22-alpine AS builder

WORKDIR /app

# 安装依赖
RUN apk add --no-cache gcc musl-dev sqlite-dev

# 复制 go.mod 和 go.sum
COPY go.mod go.sum* ./
RUN go mod download

# 复制源代码
COPY . .

# 编译
RUN CGO_ENABLED=1 GOOS=linux go build -o llm-lens-proxy .

# 运行阶段
FROM alpine:3.19

RUN apk add --no-cache sqlite-libs ca-certificates

WORKDIR /app

# 从构建阶段复制二进制文件
COPY --from=builder /app/llm-lens-proxy .

# 创建数据目录
RUN mkdir -p /data

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["./llm-lens-proxy", "-port", "3000", "-db", "/data/llm-lens.db"]
