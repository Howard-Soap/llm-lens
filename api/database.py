"""
LLM Lens - 数据库模块
SQLite 异步数据库操作
"""

import aiosqlite
import os
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from .models import (
    RequestRecord, OverviewResponse, CostAnalysis, PerformanceAnalysis,
    Settings, SettingsUpdate, ModelCost, TimeCost, UserCost, PrivacyLevel
)


class Database:
    """SQLite 数据库"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.db: Optional[aiosqlite.Connection] = None
        
        # 确保目录存在
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    async def connect(self):
        """连接数据库"""
        self.db = await aiosqlite.connect(self.db_path)
        self.db.row_factory = aiosqlite.Row
        await self._init_tables()
    
    async def close(self):
        """关闭数据库"""
        if self.db:
            await self.db.close()
    
    async def _init_tables(self):
        """初始化数据库表"""
        schema = """
        CREATE TABLE IF NOT EXISTS requests (
            id TEXT PRIMARY KEY,
            timestamp INTEGER NOT NULL,
            model TEXT NOT NULL,
            provider TEXT,
            input_tokens INTEGER DEFAULT 0,
            output_tokens INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            cost_usd REAL DEFAULT 0,
            latency_ms INTEGER DEFAULT 0,
            ttft_ms INTEGER DEFAULT 0,
            status_code INTEGER DEFAULT 200,
            is_error INTEGER DEFAULT 0,
            error_message TEXT,
            stream INTEGER DEFAULT 0,
            user_id TEXT,
            tags TEXT,
            metadata TEXT,
            request_body TEXT,
            response_body TEXT,
            trace_id TEXT,
            parent_span_id TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);
        CREATE INDEX IF NOT EXISTS idx_requests_model ON requests(model);
        CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
        CREATE INDEX IF NOT EXISTS idx_requests_is_error ON requests(is_error);
        CREATE INDEX IF NOT EXISTS idx_requests_trace_id ON requests(trace_id);

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        """
        
        await self.db.executescript(schema)
        
        # 插入默认设置
        default_settings = {
            "privacy_level": "metadata",
            "data_retention_days": "30",
            "mask_api_keys": "true",
            "max_request_body_size": "10240",
        }
        
        for key, value in default_settings.items():
            await self.db.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
                (key, value)
            )
        
        await self.db.commit()
    
    async def get_overview(self) -> OverviewResponse:
        """获取总览数据"""
        async with self.db.execute("""
            SELECT 
                COUNT(*) as total_requests,
                COALESCE(SUM(cost_usd), 0) as total_cost,
                COALESCE(AVG(latency_ms), 0) as avg_latency,
                COALESCE(SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 0) as error_rate
            FROM requests
        """) as cursor:
            row = await cursor.fetchone()
            
            return OverviewResponse(
                total_requests=row[0],
                total_cost_usd=row[1],
                avg_latency_ms=int(row[2]),
                error_rate=round(row[3], 2),
                requests_change=0,  # TODO: 计算变化率
                cost_change=0,
                latency_change=0,
                error_change=0
            )
    
    async def get_requests(
        self,
        limit: int = 50,
        offset: int = 0,
        model: Optional[str] = None,
        user_id: Optional[str] = None,
        is_error: Optional[bool] = None,
        time_range: Optional[str] = None
    ) -> Tuple[List[RequestRecord], int]:
        """获取请求列表"""
        # 构建查询条件
        where_clauses = ["1=1"]
        params = []
        
        if model:
            where_clauses.append("model = ?")
            params.append(model)
        
        if user_id:
            where_clauses.append("user_id = ?")
            params.append(user_id)
        
        if is_error is not None:
            where_clauses.append("is_error = ?")
            params.append(1 if is_error else 0)
        
        if time_range:
            now = datetime.now()
            if time_range == "1h":
                start = now - timedelta(hours=1)
            elif time_range == "24h":
                start = now - timedelta(hours=24)
            elif time_range == "7d":
                start = now - timedelta(days=7)
            elif time_range == "30d":
                start = now - timedelta(days=30)
            else:
                start = None
            
            if start:
                where_clauses.append("timestamp >= ?")
                params.append(int(start.timestamp()))
        
        where_sql = " AND ".join(where_clauses)
        
        # 获取总数
        async with self.db.execute(
            f"SELECT COUNT(*) FROM requests WHERE {where_sql}",
            params
        ) as cursor:
            total = (await cursor.fetchone())[0]
        
        # 获取数据
        async with self.db.execute(f"""
            SELECT id, timestamp, model, provider, input_tokens, output_tokens,
                total_tokens, cost_usd, latency_ms, ttft_ms, status_code,
                is_error, error_message, stream, user_id, tags, metadata,
                request_body, response_body, trace_id, parent_span_id
            FROM requests 
            WHERE {where_sql}
            ORDER BY timestamp DESC 
            LIMIT ? OFFSET ?
        """, params + [limit, offset]) as cursor:
            rows = await cursor.fetchall()
            
            requests = []
            for row in rows:
                requests.append(RequestRecord(
                    id=row[0],
                    timestamp=datetime.fromtimestamp(row[1]),
                    model=row[2],
                    provider=row[3],
                    input_tokens=row[4],
                    output_tokens=row[5],
                    total_tokens=row[6],
                    cost_usd=row[7],
                    latency_ms=row[8],
                    ttft_ms=row[9],
                    status_code=row[10],
                    is_error=bool(row[11]),
                    error_message=row[12],
                    stream=bool(row[13]),
                    user_id=row[14],
                    tags=row[15],
                    metadata=row[16],
                    request_body=row[17],
                    response_body=row[18],
                    trace_id=row[19],
                    parent_span_id=row[20]
                ))
            
            return requests, total
    
    async def get_request_by_id(self, request_id: str) -> Optional[RequestRecord]:
        """根据 ID 获取请求"""
        async with self.db.execute("""
            SELECT id, timestamp, model, provider, input_tokens, output_tokens,
                total_tokens, cost_usd, latency_ms, ttft_ms, status_code,
                is_error, error_message, stream, user_id, tags, metadata,
                request_body, response_body, trace_id, parent_span_id
            FROM requests 
            WHERE id = ?
        """, (request_id,)) as cursor:
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            return RequestRecord(
                id=row[0],
                timestamp=datetime.fromtimestamp(row[1]),
                model=row[2],
                provider=row[3],
                input_tokens=row[4],
                output_tokens=row[5],
                total_tokens=row[6],
                cost_usd=row[7],
                latency_ms=row[8],
                ttft_ms=row[9],
                status_code=row[10],
                is_error=bool(row[11]),
                error_message=row[12],
                stream=bool(row[13]),
                user_id=row[14],
                tags=row[15],
                metadata=row[16],
                request_body=row[17],
                response_body=row[18],
                trace_id=row[19],
                parent_span_id=row[20]
            )
    
    async def get_costs(
        self,
        time_range: Optional[str] = None,
        group_by: Optional[str] = None
    ) -> CostAnalysis:
        """获取成本分析"""
        # 按模型
        by_model = []
        async with self.db.execute("""
            SELECT model, SUM(cost_usd) as total_cost, COUNT(*) as request_count, AVG(cost_usd) as avg_cost
            FROM requests
            GROUP BY model
            ORDER BY total_cost DESC
        """) as cursor:
            async for row in cursor:
                by_model.append(ModelCost(
                    model=row[0],
                    total_cost_usd=row[1],
                    request_count=row[2],
                    avg_cost_usd=row[3]
                ))
        
        # 按时间
        by_time = []
        async with self.db.execute("""
            SELECT 
                timestamp / 86400 * 86400 as day,
                SUM(cost_usd) as total_cost,
                COUNT(*) as request_count
            FROM requests
            WHERE timestamp > strftime('%s', 'now') - 7 * 86400
            GROUP BY day
            ORDER BY day
        """) as cursor:
            async for row in cursor:
                by_time.append(TimeCost(
                    timestamp=datetime.fromtimestamp(row[0]),
                    total_cost_usd=row[1],
                    request_count=row[2]
                ))
        
        # 按用户
        by_user = []
        async with self.db.execute("""
            SELECT user_id, SUM(cost_usd) as total_cost, COUNT(*) as request_count
            FROM requests
            WHERE user_id != '' AND user_id IS NOT NULL
            GROUP BY user_id
            ORDER BY total_cost DESC
            LIMIT 10
        """) as cursor:
            async for row in cursor:
                by_user.append(UserCost(
                    user_id=row[0],
                    total_cost_usd=row[1],
                    request_count=row[2]
                ))
        
        return CostAnalysis(
            by_model=by_model,
            by_time=by_time,
            by_user=by_user
        )
    
    async def get_performance(
        self,
        time_range: Optional[str] = None
    ) -> PerformanceAnalysis:
        """获取性能分析"""
        async with self.db.execute("""
            SELECT 
                AVG(latency_ms) as avg_latency,
                COALESCE(SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 0) as error_rate
            FROM requests
        """) as cursor:
            row = await cursor.fetchone()
            
            avg_latency = int(row[0] or 0)
            error_rate = round(row[1] or 0, 2)
            
            return PerformanceAnalysis(
                latency_p50=avg_latency,
                latency_p95=avg_latency * 2,
                latency_p99=avg_latency * 3,
                avg_latency=avg_latency,
                error_rate=error_rate,
                ttft_p50=avg_latency // 4,
                ttft_p95=avg_latency // 2
            )
    
    async def get_settings(self) -> Settings:
        """获取设置"""
        settings = {}
        async with self.db.execute("SELECT key, value FROM settings") as cursor:
            async for row in cursor:
                settings[row[0]] = row[1]
        
        return Settings(
            privacy_level=PrivacyLevel(settings.get("privacy_level", "metadata")),
            data_retention_days=int(settings.get("data_retention_days", 30)),
            mask_api_keys=settings.get("mask_api_keys", "true") == "true",
            max_request_body_size=int(settings.get("max_request_body_size", 10240))
        )
    
    async def update_settings(self, update: SettingsUpdate) -> Settings:
        """更新设置"""
        updates = {}
        
        if update.privacy_level is not None:
            updates["privacy_level"] = update.privacy_level.value
        
        if update.data_retention_days is not None:
            updates["data_retention_days"] = str(update.data_retention_days)
        
        if update.mask_api_keys is not None:
            updates["mask_api_keys"] = str(update.mask_api_keys).lower()
        
        if update.max_request_body_size is not None:
            updates["max_request_body_size"] = str(update.max_request_body_size)
        
        for key, value in updates.items():
            await self.db.execute(
                "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, strftime('%s', 'now'))",
                (key, value)
            )
        
        await self.db.commit()
        
        return await self.get_settings()
    
    async def export_data(
        self,
        format: str = "json",
        time_range: Optional[str] = None
    ) -> List[dict]:
        """导出数据"""
        requests, _ = await self.get_requests(limit=10000, time_range=time_range)
        
        if format == "json":
            return [r.dict() for r in requests]
        else:
            # CSV 格式
            return [r.dict() for r in requests]
