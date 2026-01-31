"""错误处理模块测试

测试范围：
- core/errors.py: 统一错误处理
"""
import pytest
from fastapi import status

from app.core.errors import (
    AppError,
    ErrorCode,
    ValidationError,
    NotFoundError,
    CalculationError,
    PricingError,
    StorageError,
    handle_calculation_error,
    validate_numeric_range,
    validate_positive,
    validate_percentage,
)


class TestErrorCode:
    """测试错误代码枚举"""

    def test_error_codes(self):
        """测试所有错误代码"""
        assert ErrorCode.INTERNAL_ERROR.value == "INTERNAL_ERROR"
        assert ErrorCode.VALIDATION_ERROR.value == "VALIDATION_ERROR"
        assert ErrorCode.NOT_FOUND.value == "NOT_FOUND"
        assert ErrorCode.CALCULATION_FAILED.value == "CALCULATION_FAILED"


class TestAppError:
    """测试应用错误类"""

    def test_app_error_creation(self):
        """测试创建应用错误"""
        error = AppError(
            code=ErrorCode.INTERNAL_ERROR,
            message="测试错误",
            status_code=400,
        )

        assert error.code == ErrorCode.INTERNAL_ERROR
        assert error.message == "测试错误"
        assert error.status_code == 400
        assert error.details == {}

    def test_app_error_with_details(self):
        """测试带详情的应用错误"""
        error = AppError(
            code=ErrorCode.VALIDATION_ERROR,
            message="验证失败",
            details={"field": "name", "reason": "required"},
            status_code=422,
        )

        assert error.details == {"field": "name", "reason": "required"}

    def test_to_dict(self):
        """测试转换为字典"""
        error = AppError(
            code=ErrorCode.INTERNAL_ERROR,
            message="测试错误",
            details={"key": "value"},
        )

        result = error.to_dict()

        assert result["code"] == "INTERNAL_ERROR"
        assert result["message"] == "测试错误"
        assert result["details"] == {"key": "value"}

    def test_to_http_exception(self):
        """测试转换为 HTTP 异常"""
        error = AppError(
            code=ErrorCode.NOT_FOUND,
            message="资源不存在",
            status_code=404,
        )

        http_exc = error.to_http_exception()

        assert http_exc.status_code == 404


class TestValidationError:
    """测试验证错误"""

    def test_validation_error(self):
        """测试创建验证错误"""
        error = ValidationError(message="参数无效")

        assert error.code == ErrorCode.VALIDATION_ERROR
        assert error.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_validation_error_with_field(self):
        """测试带字段的验证错误"""
        error = ValidationError(
            message="字段不能为空",
            field="name",
            value="",
        )

        assert error.details["field"] == "name"
        assert error.details["value"] == ""


class TestNotFoundError:
    """测试资源不存在错误"""

    def test_not_found_error(self):
        """测试创建资源不存在错误"""
        error = NotFoundError(resource="用户", identifier="user_123")

        assert error.code == ErrorCode.NOT_FOUND
        assert error.status_code == status.HTTP_404_NOT_FOUND
        assert "用户" in error.message
        assert error.details["resource"] == "用户"
        assert error.details["identifier"] == "user_123"


class TestCalculationError:
    """测试计算错误"""

    def test_calculation_error(self):
        """测试创建计算错误"""
        error = CalculationError(message="计算失败")

        assert error.code == ErrorCode.CALCULATION_FAILED
        assert error.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_calculation_error_with_type(self):
        """测试带类型的计算错误"""
        error = CalculationError(
            message="存储成本计算失败",
            calculation_type="storage_cost",
        )

        assert error.details["calculation_type"] == "storage_cost"


class TestPricingError:
    """测试定价错误"""

    def test_pricing_error(self):
        """测试创建定价错误"""
        error = PricingError(region="us-east-1")

        assert error.code == ErrorCode.PRICING_NOT_AVAILABLE
        assert error.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert error.details["region"] == "us-east-1"

    def test_pricing_error_custom_message(self):
        """测试自定义消息的定价错误"""
        error = PricingError(region="us-west-2", message="定价服务不可用")

        assert error.message == "定价服务不可用"


class TestStorageError:
    """测试存储错误"""

    def test_storage_error(self):
        """测试创建存储错误"""
        error = StorageError(operation="save", message="保存失败")

        assert error.code == ErrorCode.STORAGE_ERROR
        assert error.details["operation"] == "save"


class TestHandleCalculationError:
    """测试计算错误处理装饰器"""

    def test_decorator_passes_result(self):
        """测试装饰器正常传递结果"""

        @handle_calculation_error
        def calculate():
            return 42

        assert calculate() == 42

    def test_decorator_converts_value_error(self):
        """测试装饰器转换 ValueError"""

        @handle_calculation_error
        def calculate():
            raise ValueError("无效的值")

        with pytest.raises(ValidationError):
            calculate()

    def test_decorator_passes_validation_error(self):
        """测试装饰器传递 ValidationError"""

        @handle_calculation_error
        def calculate():
            raise ValidationError("验证失败")

        with pytest.raises(ValidationError):
            calculate()

    def test_decorator_converts_unexpected_error(self):
        """测试装饰器转换未预期错误"""

        @handle_calculation_error
        def calculate():
            raise RuntimeError("运行时错误")

        with pytest.raises(CalculationError):
            calculate()


class TestValidateNumericRange:
    """测试数值范围验证"""

    def test_valid_value(self):
        """测试有效值"""
        result = validate_numeric_range(5, min_value=0, max_value=10)
        assert result == 5

    def test_value_below_min(self):
        """测试值低于最小值"""
        with pytest.raises(ValidationError) as exc_info:
            validate_numeric_range(-1, min_value=0)

        assert "不能小于" in str(exc_info.value.message)

    def test_value_above_max(self):
        """测试值高于最大值"""
        with pytest.raises(ValidationError) as exc_info:
            validate_numeric_range(11, max_value=10)

        assert "不能大于" in str(exc_info.value.message)

    def test_no_limits(self):
        """测试无限制"""
        result = validate_numeric_range(100)
        assert result == 100


class TestValidatePositive:
    """测试正数验证"""

    def test_positive_value(self):
        """测试正数"""
        result = validate_positive(5)
        assert result == 5

    def test_zero_value(self):
        """测试零值"""
        with pytest.raises(ValidationError):
            validate_positive(0)

    def test_negative_value(self):
        """测试负数"""
        with pytest.raises(ValidationError):
            validate_positive(-1)


class TestValidatePercentage:
    """测试百分比验证"""

    def test_valid_percentage(self):
        """测试有效百分比"""
        result = validate_percentage(0.5)
        assert result == 0.5

    def test_zero_percentage(self):
        """测试零百分比"""
        result = validate_percentage(0)
        assert result == 0

    def test_full_percentage(self):
        """测试 100% 百分比"""
        result = validate_percentage(1)
        assert result == 1

    def test_negative_percentage(self):
        """测试负百分比"""
        with pytest.raises(ValidationError):
            validate_percentage(-0.1)

    def test_over_percentage(self):
        """测试超过 100% 的百分比"""
        with pytest.raises(ValidationError):
            validate_percentage(1.1)
