"""定价查询 API 路由"""
from typing import Dict, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models.pricing import PricingLoader, S3Pricing
from app.models.enums import StorageClass

router = APIRouter(prefix="/pricing", tags=["定价"])


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
    lifecycle_transition_per_1000: float = Field(default=0, description="每千次生命周期转换费用")


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
    storage_classes: Dict[str, StorageClassPricing] = Field(..., description="存储类型定价")
    data_transfer: DataTransferPricing = Field(..., description="数据传输定价")


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


@router.get("/regions", response_model=RegionsResponse)
async def list_regions() -> RegionsResponse:
    """
    获取支持的区域列表

    Returns:
        可用区域列表
    """
    available = PricingLoader.available_regions()
    regions = []
    for region in available:
        name = REGION_NAMES.get(region, region)
        regions.append(RegionInfo(region=region, name=name))

    return RegionsResponse(regions=regions)


@router.get("/{region}", response_model=PricingResponse)
async def get_region_pricing(region: str) -> PricingResponse:
    """
    获取指定区域的定价信息

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
