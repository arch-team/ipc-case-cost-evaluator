"""成本计算 API 路由"""
from fastapi import APIRouter

from app.models.dimensions import CostCalculationInput
from app.models.results import CostSummary
from app.api.utils import validate_region, get_calculator, handle_calculation_error

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
    validate_region(input_data.pricing.region)

    # 选择并执行计算
    calculator = get_calculator(input_data)

    try:
        return calculator.calculate(input_data)
    except Exception as e:
        handle_calculation_error(e)
