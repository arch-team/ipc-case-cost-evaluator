"""成本计算 API 路由"""
from typing import Union
from fastapi import APIRouter, HTTPException
from app.models.dimensions import CostCalculationInput
from app.models.results import CostSummary
from app.models.enums import StorageClass
from app.services.calculator.s3_standard import S3StandardCalculator
from app.services.calculator.s3_glacier import S3GlacierCalculator
from app.services.calculator.lifecycle import LifecycleCalculator
from app.models.pricing import PricingLoader

# 计算器类型联合
Calculator = Union[S3StandardCalculator, S3GlacierCalculator, LifecycleCalculator]

router = APIRouter(prefix="/calculate", tags=["计算"])


@router.post("", response_model=CostSummary)
async def calculate_cost(input_data: CostCalculationInput) -> CostSummary:
    """
    计算存储成本

    根据输入的功能维度、技术维度和价格维度计算 S3 存储成本。
    支持 S3 Standard、Glacier IR 和生命周期混合策略。

    Args:
        input_data: 三类维度输入

    Returns:
        成本计算汇总，包括月度/年度成本、费用明细和中间指标
    """
    # 验证区域
    try:
        PricingLoader.load(input_data.pricing.region)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 根据存储类型和生命周期策略选择计算器
    lifecycle_policy = input_data.technical.lifecycle_policy
    storage_class = input_data.technical.storage_class

    calculator: Calculator
    if lifecycle_policy and lifecycle_policy.enabled:
        # 使用生命周期计算器
        calculator = LifecycleCalculator()
    elif storage_class == StorageClass.GLACIER_IR:
        calculator = S3GlacierCalculator()
    else:
        calculator = S3StandardCalculator()

    try:
        result = calculator.calculate(input_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"计算错误: {str(e)}")
