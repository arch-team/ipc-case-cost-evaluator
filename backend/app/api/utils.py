"""API 工具函数

提供 API 路由层的通用工具函数，减少重复代码。
"""
from typing import TYPE_CHECKING, Union
from fastapi import HTTPException

from app.models.dimensions import CostCalculationInput
from app.models.enums import StorageClass
from app.models.pricing import PricingLoader
from app.services.calculator.s3_standard import S3StandardCalculator
from app.services.calculator.s3_glacier import S3GlacierCalculator
from app.services.calculator.lifecycle import LifecycleCalculator

if TYPE_CHECKING:
    # 计算器类型联合
    Calculator = Union[S3StandardCalculator, S3GlacierCalculator, LifecycleCalculator]


def validate_region(region: str) -> None:
    """验证 AWS 区域是否支持

    Args:
        region: AWS 区域代码

    Raises:
        HTTPException: 当区域不支持时返回 400 错误
    """
    try:
        PricingLoader.load(region)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


def get_calculator(input_data: CostCalculationInput) -> "Calculator":
    """根据输入选择合适的计算器

    根据存储类型和生命周期策略选择对应的计算器实例。

    Args:
        input_data: 成本计算输入

    Returns:
        计算器实例
    """
    lifecycle_policy = input_data.technical.lifecycle_policy
    storage_class = input_data.technical.storage_class

    if lifecycle_policy and lifecycle_policy.enabled:
        return LifecycleCalculator()
    elif storage_class == StorageClass.GLACIER_IR:
        return S3GlacierCalculator()
    else:
        return S3StandardCalculator()


def handle_calculation_error(error: Exception) -> None:
    """处理计算错误

    统一的错误处理逻辑，将异常转换为 HTTP 错误响应。

    Args:
        error: 捕获的异常

    Raises:
        HTTPException: 返回 500 错误和错误详情
    """
    error_message = str(error)
    # 可以在这里添加日志记录
    raise HTTPException(status_code=500, detail=f"计算错误: {error_message}")