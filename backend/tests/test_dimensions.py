"""维度模型测试

测试三类维度数据模型：功能维度、技术维度、价格模型维度。
遵循 TDD 流程，先编写测试用例。
"""
import pytest
from pydantic import ValidationError

from app.models.dimensions import (
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
    LifecyclePolicy,
    CostCalculationInput,
)
from app.models.enums import (
    RecordingMode,
    VideoQuality,
    SegmentStrategy,
    StorageClass,
    PricingModel,
)


class TestFunctionalDimensions:
    """功能维度测试"""

    def test_create_with_defaults(self):
        """测试使用默认值创建功能维度"""
        dims = FunctionalDimensions(device_count=100)
        assert dims.device_count == 100
        assert dims.recording_mode == RecordingMode.EVENT_TRIGGERED
        assert dims.video_quality == VideoQuality.P1080
        assert dims.access_pattern == 0.1
        assert dims.retention_days == 30

    def test_device_count_validation(self):
        """测试设备数量验证 - 必须大于 0"""
        with pytest.raises(ValidationError):
            FunctionalDimensions(device_count=0)
        with pytest.raises(ValidationError):
            FunctionalDimensions(device_count=-1)

    def test_access_pattern_range(self):
        """测试回看比例范围验证 - 必须在 0.0 到 1.0 之间"""
        dims = FunctionalDimensions(device_count=100, access_pattern=0.5)
        assert dims.access_pattern == 0.5
        with pytest.raises(ValidationError):
            FunctionalDimensions(device_count=100, access_pattern=1.5)
        with pytest.raises(ValidationError):
            FunctionalDimensions(device_count=100, access_pattern=-0.1)

    def test_data_rate_kb_property(self):
        """测试数据速率属性 - 从视频质量获取"""
        dims = FunctionalDimensions(device_count=100, video_quality=VideoQuality.P1080)
        assert dims.data_rate_kb == 312.5

    def test_create_with_all_params(self):
        """测试使用所有参数创建功能维度"""
        dims = FunctionalDimensions(
            device_count=500,
            recording_mode=RecordingMode.CONTINUOUS,
            video_quality=VideoQuality.P4K,
            access_pattern=0.3,
            retention_days=90,
            events_per_day=1000,
            event_duration_sec=30,
            scheduled_hours=8,
            segment_strategy=SegmentStrategy.FIXED_SIZE,
            segment_value=30,
        )
        assert dims.device_count == 500
        assert dims.recording_mode == RecordingMode.CONTINUOUS
        assert dims.video_quality == VideoQuality.P4K
        assert dims.access_pattern == 0.3
        assert dims.retention_days == 90
        assert dims.events_per_day == 1000
        assert dims.event_duration_sec == 30
        assert dims.scheduled_hours == 8
        assert dims.segment_strategy == SegmentStrategy.FIXED_SIZE
        assert dims.segment_value == 30

    def test_retention_days_range(self):
        """测试保留天数范围验证 - 1 到 365 天"""
        dims = FunctionalDimensions(device_count=100, retention_days=365)
        assert dims.retention_days == 365
        with pytest.raises(ValidationError):
            FunctionalDimensions(device_count=100, retention_days=0)
        with pytest.raises(ValidationError):
            FunctionalDimensions(device_count=100, retention_days=400)

    def test_scheduled_hours_range(self):
        """测试每日录像小时数范围验证 - 0 到 24 小时"""
        dims = FunctionalDimensions(device_count=100, scheduled_hours=24)
        assert dims.scheduled_hours == 24
        dims = FunctionalDimensions(device_count=100, scheduled_hours=0)
        assert dims.scheduled_hours == 0
        with pytest.raises(ValidationError):
            FunctionalDimensions(device_count=100, scheduled_hours=25)


class TestLifecyclePolicy:
    """生命周期策略测试"""

    def test_create_default_disabled(self):
        """测试默认禁用状态"""
        policy = LifecyclePolicy()
        assert policy.enabled is False
        assert policy.transition_days == 7
        assert policy.target_class == StorageClass.GLACIER_IR

    def test_create_enabled_policy(self):
        """测试创建启用的生命周期策略"""
        policy = LifecyclePolicy(
            enabled=True,
            transition_days=14,
            target_class=StorageClass.DEEP_ARCHIVE,
        )
        assert policy.enabled is True
        assert policy.transition_days == 14
        assert policy.target_class == StorageClass.DEEP_ARCHIVE

    def test_transition_days_validation(self):
        """测试转换天数验证 - 必须大于等于 1"""
        with pytest.raises(ValidationError):
            LifecyclePolicy(transition_days=0)
        with pytest.raises(ValidationError):
            LifecyclePolicy(transition_days=-1)


class TestTechnicalDimensions:
    """技术维度测试"""

    def test_create_with_defaults(self):
        """测试使用默认值创建技术维度"""
        dims = TechnicalDimensions()
        assert dims.storage_class == StorageClass.STANDARD
        assert dims.lifecycle_policy is None

    def test_with_lifecycle_policy(self):
        """测试带生命周期策略的技术维度"""
        policy = LifecyclePolicy(
            enabled=True,
            transition_days=7,
            target_class=StorageClass.GLACIER_IR,
        )
        dims = TechnicalDimensions(
            storage_class=StorageClass.STANDARD,
            lifecycle_policy=policy,
        )
        assert dims.lifecycle_policy.enabled is True
        assert dims.lifecycle_policy.transition_days == 7

    def test_with_glacier_storage_class(self):
        """测试 Glacier 存储类型"""
        dims = TechnicalDimensions(storage_class=StorageClass.GLACIER_IR)
        assert dims.storage_class == StorageClass.GLACIER_IR


class TestPricingDimensions:
    """价格模型维度测试"""

    def test_create_with_defaults(self):
        """测试使用默认值创建价格维度"""
        dims = PricingDimensions()
        assert dims.region == "ap-northeast-1"
        assert dims.discount_percent == 0.0
        assert dims.pricing_model == PricingModel.ON_DEMAND

    def test_discount_range(self):
        """测试折扣比例范围验证 - 0.0 到 0.5"""
        dims = PricingDimensions(discount_percent=0.3)
        assert dims.discount_percent == 0.3
        dims = PricingDimensions(discount_percent=0.0)
        assert dims.discount_percent == 0.0
        dims = PricingDimensions(discount_percent=0.5)
        assert dims.discount_percent == 0.5
        with pytest.raises(ValidationError):
            PricingDimensions(discount_percent=0.6)
        with pytest.raises(ValidationError):
            PricingDimensions(discount_percent=-0.1)

    def test_with_reserved_pricing(self):
        """测试预留容量计费模式"""
        dims = PricingDimensions(
            region="us-east-1",
            discount_percent=0.2,
            pricing_model=PricingModel.RESERVED,
        )
        assert dims.region == "us-east-1"
        assert dims.discount_percent == 0.2
        assert dims.pricing_model == PricingModel.RESERVED


class TestCostCalculationInput:
    """成本计算输入测试"""

    def test_create_full_input(self):
        """测试创建完整的成本计算输入"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(device_count=1000),
            technical=TechnicalDimensions(),
            pricing=PricingDimensions(),
        )
        assert input_data.functional.device_count == 1000
        assert input_data.technical.storage_class == StorageClass.STANDARD
        assert input_data.pricing.region == "ap-northeast-1"

    def test_create_with_defaults(self):
        """测试使用默认技术和价格维度"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(device_count=500),
        )
        assert input_data.functional.device_count == 500
        assert input_data.technical.storage_class == StorageClass.STANDARD
        assert input_data.pricing.pricing_model == PricingModel.ON_DEMAND

    def test_create_complex_scenario(self):
        """测试复杂场景的成本计算输入"""
        policy = LifecyclePolicy(
            enabled=True,
            transition_days=7,
            target_class=StorageClass.GLACIER_IR,
        )
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=10000,
                recording_mode=RecordingMode.CONTINUOUS,
                video_quality=VideoQuality.P4K,
                access_pattern=0.05,
                retention_days=180,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
                lifecycle_policy=policy,
            ),
            pricing=PricingDimensions(
                region="ap-northeast-1",
                discount_percent=0.15,
                pricing_model=PricingModel.RESERVED,
            ),
        )
        assert input_data.functional.device_count == 10000
        assert input_data.functional.video_quality == VideoQuality.P4K
        assert input_data.technical.lifecycle_policy.enabled is True
        assert input_data.pricing.discount_percent == 0.15
