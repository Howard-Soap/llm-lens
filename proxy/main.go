package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-gonic/gin"
)

var (
	port     = flag.Int("port", 3000, "Server port")
	dbPath   = flag.String("db", "./data/llm-lens.db", "SQLite database path")
	logLevel = flag.String("log-level", "info", "Log level (debug, info, warn, error)")
)

func main() {
	flag.Parse()

	// 初始化数据库
	db, err := NewStorage(*dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// 初始化代理处理器
	handler := NewProxyHandler(db)

	// 设置 Gin 路由
	r := gin.Default()

	// 代理路由 - 转发 LLM API 请求
	v1 := r.Group("/v1")
	{
		v1.POST("/chat/completions", handler.ChatCompletions)
		v1.POST("/completions", handler.Completions)
		v1.POST("/embeddings", handler.Embeddings)
		v1.POST("/images/generations", handler.ImageGenerations)
	}

	// 管理 API
	api := r.Group("/api")
	{
		api.GET("/overview", handler.GetOverview)
		api.GET("/requests", handler.GetRequests)
		api.GET("/requests/:id", handler.GetRequestByID)
		api.GET("/costs", handler.GetCosts)
		api.GET("/performance", handler.GetPerformance)
		api.GET("/settings", handler.GetSettings)
		api.PUT("/settings", handler.UpdateSettings)
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "version": "0.1.0"})
	})

	// 启动服务器
	addr := fmt.Sprintf(":%d", *port)
	log.Printf("🔍 LLM Lens starting on %s", addr)
	log.Printf("📊 Dashboard: http://localhost%s", addr)
	log.Printf("🔗 Proxy: http://localhost%s/v1", addr)

	// 优雅关闭
	go func() {
		if err := r.Run(addr); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// 等待中断信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 LLM Lens shutting down...")
}
