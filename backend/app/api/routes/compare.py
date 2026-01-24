"""方案对比 API 路由"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.models.dimensions import CostCalculationInput
from app.models.results import Recommendation
from app.models.pricing import PricingLoader
from app.services.calculator.comparator import StorageComparator
from app.services.calculator.recommender import StorageRecommender

router = APIRouter(prefix="/compare", tags=["对比"])


class CompareResponse(BaseModel):
    """对比响应"""
    baseline: str = Field(..., description="基准方案")
    items: list = Field(..., description="对比项列表")
    recommendation: Optional[Recommendation] = Field(
        default=None, description="优化推荐"
    )


@router.post("", response_model=CompareResponse)
async def compare_storage_options(
    input_data: CostCalculationInput,
    include_lifecycle: bool = Query(default=True, description="是否包含生命周期选项"),
    lifecycle_days: int = Query(default=7, ge=1, le=365, description="生命周期转换天数"),
) -> CompareResponse:
    """
    对比存储方案

    对比 S3 Standard、Glacier IR 和生命周期混合策略的成本。

    Args:
        input_data: 三类维度输入
        include_lifecycle: 是否包含生命周期选项
        lifecycle_days: 生命周期转换天数

    Returns:
        方案对比结果，包括各方案成本和优化推荐
    """
    # 验证区域
    try:
        PricingLoader.load(input_data.pricing.region)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        # 执行方案对比
        comparator = StorageComparator()
        comparison = comparator.compare(
            input_data,
            include_lifecycle=include_lifecycle,
            lifecycle_days=lifecycle_days,
        )

        # 生成优化推荐
        recommender = StorageRecommender()
        recommendation = recommender.recommend(input_data)

        return CompareResponse(
            baseline=comparison.baseline,
            items=[item.model_dump() for item in comparison.items],
            recommendation=recommendation,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"对比错误: {str(e)}")
