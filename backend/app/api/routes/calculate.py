"""成本计算 API 路由"""
from fastapi import APIRouter, HTTPException
from app.models.dimensions import CostCalculationInput
from app.models.results import CostSummary
from app.models.enums import StorageClass
from app.services.calculator.s3_standard import S3StandardCalculator
from app.services.calculator.s3_glacier import S3GlacierCalculator
from app.models.pricing import PricingLoader

router = APIRouter(prefix="/calculate", tags=["计算"])


@router.post("", response_model=CostSummary)
async def calculate_cost(input_data: CostCalculationInput) -> CostSummary:
    """
    计算存储成本

    根据输入的功能维度、技术维度和价格维度计算 S3 存储成本。

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

    # 根据存储类型选择计算器
    storage_class = input_data.technical.storage_class
    calculator = (
        S3GlacierCalculator() if storage_class == StorageClass.GLACIER_IR
        else S3StandardCalculator()
    )

    try:
        result = calculator.calculate(input_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"计算错误: {str(e)}")
