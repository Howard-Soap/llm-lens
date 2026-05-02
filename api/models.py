"""
LLM Lens - 数据模型
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PrivacyLevel(str, Enum):
    NONE = "none"
    METADATA_ONLY = "metadata"
    MASKED = "masked"
    FULL = "full"


class RequestRecord(BaseModel):
    """请求记录"""
    id: str
    timestamp: datetime
    model: str
    provider: Optional[str] = None
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0
    latency_ms: int = 0
    ttft_ms: int = 0
    status_code: int = 200
    is_error: bool = False
    error_message: Optional[str] = None
    stream: bool = False
    user_id: Optional[str] = None
    tags: Optional[str] = None
    metadata: Optional[str] = None
    request_body: Optional[str] = None
    response_body: Optional[str] = None
    trace_id: Optional[str] = None
    parent_span_id: Optional[str] = None


class RequestListResponse(BaseModel):
    """请求列表响应"""
    data: List[RequestRecord]
    total: int
    limit: int
    offset: int


class RequestDetail(RequestRecord):
    """请求详情"""
    pass


class ModelCost(BaseModel):
    """模型成本"""
    model: str
    total_cost_usd: float
    request_count: int
    avg_cost_usd: float


class TimeCost(BaseModel):
    """时间成本"""
    timestamp: datetime
    total_cost_usd: float
    request_count: int


class UserCost(BaseModel):
    """用户成本"""
    user_id: str
    total_cost_usd: float
    request_count: int


class CostAnalysis(BaseModel):
    """成本分析"""
    by_model: List[ModelCost] = []
    by_time: List[TimeCost] = []
    by_user: List[UserCost] = []


class PerformanceAnalysis(BaseModel):
    """性能分析"""
    latency_p50: int = 0
    latency_p95: int = 0
    latency_p99: int = 0
    avg_latency: int = 0
    error_rate: float = 0.0
    ttft_p50: int = 0
    ttft_p95: int = 0


class OverviewResponse(BaseModel):
    """总览响应"""
    total_requests: int = 0
    total_cost_usd: float = 0.0
    avg_latency_ms: int = 0
    error_rate: float = 0.0
    requests_change: float = 0.0
    cost_change: float = 0.0
    latency_change: float = 0.0
    error_change: float = 0.0


class Settings(BaseModel):
    """设置"""
    privacy_level: PrivacyLevel = PrivacyLevel.METADATA_ONLY
    data_retention_days: int = 30
    mask_api_keys: bool = True
    max_request_body_size: int = 10240


class SettingsUpdate(BaseModel):
    """设置更新"""
    privacy_level: Optional[PrivacyLevel] = None
    data_retention_days: Optional[int] = None
    mask_api_keys: Optional[bool] = None
    max_request_body_size: Optional[int] = None
