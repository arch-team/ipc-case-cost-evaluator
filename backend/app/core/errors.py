"""统一的错误处理机制

提供结构化的错误类型和处理函数，改进错误追踪和用户反馈。
"""
from typing import Optional, Dict, Any
from enum import Enum
from fastapi import HTTPException, status


class ErrorCode(str, Enum):
    """错误代码枚举"""

    # 通用错误
    INTERNAL_ERROR = "INTERNAL_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"

    # 业务错误
    INVALID_INPUT = "INVALID_INPUT"
    CALCULATION_FAILED = "CALCULATION_FAILED"
    PRICING_NOT_AVAILABLE = "PRICING_NOT_AVAILABLE"
    STORAGE_ERROR = "STORAGE_ERROR"

    # 数据错误
    DATA_INTEGRITY_ERROR = "DATA_INTEGRITY_ERROR"
    DUPLICATE_RESOURCE = "DUPLICATE_RESOURCE"
    RESOURCE_LIMIT_EXCEEDED = "RESOURCE_LIMIT_EXCEEDED"


class AppError(Exception):
    """应用级异常基类"""

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ):
        self.code = code
        self.message = message
        self.details = details or {}
        self.status_code = status_code
        super().__init__(message)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "code": self.code.value,
            "message": self.message,
            "details": self.details,
        }

    def to_http_exception(self) -> HTTPException:
        """转换为 HTTP 异常"""
        return HTTPException(
            status_code=self.status_code,
            detail=self.to_dict(),
        )


class ValidationError(AppError):
    """验证错误"""

    def __init__(self, message: str, field: Optional[str] = None, value: Any = None):
        details = {}
        if field:
            details["field"] = field
        if value is not None:
            details["value"] = str(value)

        super().__init__(
            code=ErrorCode.VALIDATION_ERROR,
            message=message,
            details=details,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )


class NotFoundError(AppError):
    """资源不存在错误"""

    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            code=ErrorCode.NOT_FOUND,
            message=f"{resource} 不存在",
            details={"resource": resource, "identifier": str(identifier)},
            status_code=status.HTTP_404_NOT_FOUND,
        )


class CalculationError(AppError):
    """计算错误"""

    def __init__(self, message: str, calculation_type: Optional[str] = None):
        details = {}
        if calculation_type:
            details["calculation_type"] = calculation_type

        super().__init__(
            code=ErrorCode.CALCULATION_FAILED,
            message=message,
            details=details,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class PricingError(AppError):
    """定价数据错误"""

    def __init__(self, region: str, message: Optional[str] = None):
        super().__init__(
            code=ErrorCode.PRICING_NOT_AVAILABLE,
            message=message or f"区域 {region} 的定价数据不可用",
            details={"region": region},
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class StorageError(AppError):
    """存储操作错误"""

    def __init__(self, operation: str, message: str):
        super().__init__(
            code=ErrorCode.STORAGE_ERROR,
            message=message,
            details={"operation": operation},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


def handle_calculation_error(func):
    """计算函数错误处理装饰器"""

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ValidationError:
            raise  # 重新抛出验证错误
        except AppError:
            raise  # 重新抛出应用错误
        except ValueError as e:
            raise ValidationError(str(e))
        except Exception as e:
            # 记录未预期的错误
            import logging
            logging.error(f"Unexpected error in {func.__name__}: {e}", exc_info=True)
            raise CalculationError(f"计算过程中发生错误: {str(e)}")

    return wrapper


def validate_numeric_range(
    value: float,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    field_name: str = "value",
) -> float:
    """验证数值范围

    Args:
        value: 要验证的值
        min_value: 最小值（包含）
        max_value: 最大值（包含）
        field_name: 字段名称，用于错误消息

    Returns:
        验证后的值

    Raises:
        ValidationError: 值超出范围时
    """
    if min_value is not None and value < min_value:
        raise ValidationError(
            f"{field_name} 不能小于 {min_value}",
            field=field_name,
            value=value,
        )

    if max_value is not None and value > max_value:
        raise ValidationError(
            f"{field_name} 不能大于 {max_value}",
            field=field_name,
            value=value,
        )

    return value


def validate_positive(value: float, field_name: str = "value") -> float:
    """验证正数

    Args:
        value: 要验证的值
        field_name: 字段名称

    Returns:
        验证后的值

    Raises:
        ValidationError: 值不是正数时
    """
    if value <= 0:
        raise ValidationError(
            f"{field_name} 必须大于 0",
            field=field_name,
            value=value,
        )
    return value


def validate_percentage(value: float, field_name: str = "percentage") -> float:
    """验证百分比值（0-1 之间）

    Args:
        value: 要验证的值
        field_name: 字段名称

    Returns:
        验证后的值

    Raises:
        ValidationError: 值不在 0-1 之间时
    """
    return validate_numeric_range(value, 0, 1, field_name)