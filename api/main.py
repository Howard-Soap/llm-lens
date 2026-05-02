"""
LLM Lens - API Server
FastAPI 应用，提供 REST API 接口
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
import uvicorn

from .database import Database
from .models import (
    OverviewResponse, RequestListResponse, RequestDetail,
    CostAnalysis, PerformanceAnalysis, Settings, SettingsUpdate
)

# 全局数据库实例
db: Optional[Database] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    global db
    # 启动时初始化数据库
    db_path = os.getenv("LLM_LENS_DB_PATH", "./data/llm-lens.db")
    db = Database(db_path)
    await db.connect()
    print(f"🔍 LLM Lens API started, database: {db_path}")
    yield
    # 关闭时清理
    if db:
        await db.close()
        print("🛑 LLM Lens API stopped")


# 创建 FastAPI 应用
app = FastAPI(
    title="LLM Lens API",
    description="LLM 可观测性工具 API",
    version="0.1.0",
    lifespan=lifespan
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "version": "0.1.0"}


@app.get("/api/overview", response_model=OverviewResponse)
async def get_overview():
    """获取总览数据"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    overview = await db.get_overview()
    return overview


@app.get("/api/requests", response_model=RequestListResponse)
async def get_requests(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    model: Optional[str] = None,
    user_id: Optional[str] = None,
    is_error: Optional[bool] = None,
    time_range: Optional[str] = None
):
    """获取请求列表"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    requests, total = await db.get_requests(
        limit=limit,
        offset=offset,
        model=model,
        user_id=user_id,
        is_error=is_error,
        time_range=time_range
    )
    
    return RequestListResponse(
        data=requests,
        total=total,
        limit=limit,
        offset=offset
    )


@app.get("/api/requests/{request_id}", response_model=RequestDetail)
async def get_request_by_id(request_id: str):
    """获取请求详情"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    request = await db.get_request_by_id(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return request


@app.get("/api/costs", response_model=CostAnalysis)
async def get_costs(
    time_range: Optional[str] = None,
    group_by: Optional[str] = None
):
    """获取成本分析"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    costs = await db.get_costs(time_range=time_range, group_by=group_by)
    return costs


@app.get("/api/performance", response_model=PerformanceAnalysis)
async def get_performance(
    time_range: Optional[str] = None
):
    """获取性能分析"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    performance = await db.get_performance(time_range=time_range)
    return performance


@app.get("/api/settings", response_model=Settings)
async def get_settings():
    """获取设置"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    settings = await db.get_settings()
    return settings


@app.put("/api/settings", response_model=Settings)
async def update_settings(settings: SettingsUpdate):
    """更新设置"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    updated = await db.update_settings(settings)
    return updated


@app.get("/api/export")
async def export_data(
    format: str = Query("json", regex="^(json|csv)$"),
    time_range: Optional[str] = None
):
    """导出数据"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    data = await db.export_data(format=format, time_range=time_range)
    
    if format == "csv":
        return JSONResponse(
            content={"data": data, "format": "csv"},
            headers={"Content-Type": "text/csv"}
        )
    
    return {"data": data, "format": "json"}


if __name__ == "__main__":
    port = int(os.getenv("LLM_LENS_API_PORT", "8000"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
