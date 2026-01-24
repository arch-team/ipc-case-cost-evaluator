"""定价查询 API 路由"""
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models.pricing import PricingLoader
from app.services.pricing_service import get_pricing_service

router = APIRouter(prefix="/pricing", tags=["定价"])


# ============================================
# 响应模型定义
# ============================================


class RegionInfo(BaseModel):
    """区域信息"""

    region: str = Field(..., description="区域代码")
    name: str = Field(..., description="区域名称")


class RegionsResponse(BaseModel):
    """区域列表响应"""

    regions: List[RegionInfo]


class StorageClassPricing(BaseModel):
    """存储类型定价"""

    storage_per_gb_month: float = Field(..., description="每 GB-月存储费用")
    put_per_1000: float = Field(..., description="每千次 PUT 请求费用")
    get_per_1000: float = Field(..., description="每千次 GET 请求费用")
    retrieval_per_gb: float = Field(default=0, description="每 GB 检索费用")
    lifecycle_transition_per_1000: float = Field(
        default=0, description="每千次生命周期转换费用"
    )


class DataTransferPricing(BaseModel):
    """数据传输定价"""

    out_first_10tb_per_gb: float = Field(..., description="前 10TB 每 GB")
    out_next_40tb_per_gb: float = Field(..., description="10-50TB 每 GB")
    out_next_100tb_per_gb: float = Field(..., description="50-150TB 每 GB")
    out_over_150tb_per_gb: float = Field(..., description="超过 150TB 每 GB")


class PricingResponse(BaseModel):
    """定价响应"""

    region: str = Field(..., description="区域代码")
    region_name: str = Field(..., description="区域名称")
    currency: str = Field(..., description="货币")
    last_updated: str = Field(..., description="最后更新时间")
    storage_classes: Dict[str, StorageClassPricing] = Field(
        ..., description="存储类型定价"
    )
    data_transfer: DataTransferPricing = Field(..., description="数据传输定价")


class CacheStatusItem(BaseModel):
    """缓存状态项"""

    cached: bool = Field(..., description="是否已缓存")
    source: str = Field(..., description="数据来源")
    updated_at: str = Field(..., description="更新时间")
    is_fallback: bool = Field(..., description="是否为回退数据")
    age_seconds: float = Field(..., description="缓存年龄（秒）")
    expires_in_seconds: float = Field(..., description="过期剩余时间（秒）")


class PricingStatusResponse(BaseModel):
    """定价服务状态响应"""

    api_enabled: bool = Field(..., description="API 是否启用")
    api_available: Optional[bool] = Field(None, description="API 是否可用")
    fallback_enabled: bool = Field(..., description="本地回退是否启用")
    cache: Dict[str, CacheStatusItem] = Field(..., description="各区域缓存状态")
    available_regions: List[str] = Field(..., description="可用区域列表")


class PricingRefreshRequest(BaseModel):
    """定价刷新请求"""

    region: str = Field(..., description="要刷新的区域")


class PricingRefreshResponse(BaseModel):
    """定价刷新响应"""

    success: bool = Field(..., description="是否成功")
    region: str = Field(..., description="区域")
    source: str = Field(..., description="数据来源")
    updated_at: str = Field(..., description="更新时间")
    is_fallback: bool = Field(..., description="是否为回退数据")


# 区域名称映射
REGION_NAMES = {
    "ap-northeast-1": "Asia Pacific (Tokyo)",
    "ap-northeast-2": "Asia Pacific (Seoul)",
    "ap-northeast-3": "Asia Pacific (Osaka)",
    "ap-southeast-1": "Asia Pacific (Singapore)",
    "ap-southeast-2": "Asia Pacific (Sydney)",
    "ap-south-1": "Asia Pacific (Mumbai)",
    "us-east-1": "US East (N. Virginia)",
    "us-east-2": "US East (Ohio)",
    "us-west-1": "US West (N. California)",
    "us-west-2": "US West (Oregon)",
    "eu-west-1": "Europe (Ireland)",
    "eu-central-1": "Europe (Frankfurt)",
}


# ============================================
# 路由定义（注意：具体路由必须在参数化路由之前）
# ============================================


@router.get("/regions", response_model=RegionsResponse)
async def list_regions() -> RegionsResponse:
    """获取支持的区域列表

    Returns:
        可用区域列表
    """
    available = PricingLoader.available_regions()
    regions = []
    for region in available:
        name = REGION_NAMES.get(region, region)
        regions.append(RegionInfo(region=region, name=name))

    return RegionsResponse(regions=regions)


@router.get("/status", response_model=PricingStatusResponse)
async def get_pricing_status() -> PricingStatusResponse:
    """获取定价服务状态

    返回 API 可用性、缓存状态等信息。

    Returns:
        定价服务状态
    """
    service = get_pricing_service()
    status = service.get_pricing_status()

    # 转换缓存状态
    cache_items = {}
    for region, item in status.get("cache", {}).items():
        cache_items[region] = CacheStatusItem(**item)

    return PricingStatusResponse(
        api_enabled=status.get("api_enabled", False),
        api_available=status.get("api_available"),
        fallback_enabled=status.get("fallback_enabled", True),
        cache=cache_items,
        available_regions=status.get("available_regions", []),
    )


@router.post("/refresh", response_model=PricingRefreshResponse)
async def refresh_pricing(request: PricingRefreshRequest) -> PricingRefreshResponse:
    """强制刷新指定区域的定价数据

    清除缓存并重新获取定价数据。

    Args:
        request: 刷新请求

    Returns:
        刷新结果
    """
    service = get_pricing_service()

    try:
        pricing, metadata = service.refresh_pricing(request.region)
        return PricingRefreshResponse(
            success=True,
            region=request.region,
            source=metadata.source,
            updated_at=metadata.updated_at.isoformat(),
            is_fallback=metadata.is_fallback,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# 参数化路由放在最后
@router.get("/{region}", response_model=PricingResponse)
async def get_region_pricing(region: str) -> PricingResponse:
    """获取指定区域的定价信息

    Args:
        region: 区域代码

    Returns:
        区域定价详情
    """
    try:
        pricing = PricingLoader.load(region)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # 转换存储类型定价
    storage_classes = {}
    for storage_class, class_pricing in pricing.storage_classes.items():
        storage_classes[storage_class.value] = StorageClassPricing(
            storage_per_gb_month=class_pricing.storage_per_gb_month,
            put_per_1000=class_pricing.put_per_1000,
            get_per_1000=class_pricing.get_per_1000,
            retrieval_per_gb=class_pricing.retrieval_per_gb,
            lifecycle_transition_per_1000=class_pricing.lifecycle_transition_per_1000,
        )

    # 转换数据传输定价
    data_transfer = DataTransferPricing(
        out_first_10tb_per_gb=pricing.data_transfer.out_first_10tb_per_gb,
        out_next_40tb_per_gb=pricing.data_transfer.out_next_40tb_per_gb,
        out_next_100tb_per_gb=pricing.data_transfer.out_next_100tb_per_gb,
        out_over_150tb_per_gb=pricing.data_transfer.out_over_150tb_per_gb,
    )

    return PricingResponse(
        region=pricing.region,
        region_name=pricing.region_name,
        currency=pricing.currency,
        last_updated=pricing.last_updated,
        storage_classes=storage_classes,
        data_transfer=data_transfer,
    )
