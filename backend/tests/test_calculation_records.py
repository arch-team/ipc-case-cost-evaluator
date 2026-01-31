"""核算记录相关模块测试

测试范围：
- calculation_record_generator.py: 核算记录生成器
- calculation_records.py (models): 数据模型
- calculation_records.py (routes): API 端点
"""
import pytest
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock

from app.models.dimensions import (
    CostCalculationInput,
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
    LifecyclePolicy,
    LifecycleStage,
)
from app.models.enums import RecordingMode, VideoQuality, SegmentStrategy, StorageClass
from app.models.calculation_records import (
    StorageStrategy,
    CreateCalculationRecordRequest,
    FunctionalDimensionSnapshot,
    TechnicalDimensionSnapshot,
    PricingDimensionSnapshot,
    InputParameterSnapshot,
    IntermediateMetricsDetail,
    CostSummaryDetail,
    CostBreakdownPercent,
    CalculationRecord,
    CalculationRecordSummary,
    CalculationRecordListResponse,
)
from app.services.calculation_record_generator import (
    get_default_input,
    determine_storage_strategy,
    generate_detailed_result,
)


# ============================================================
# 测试 get_default_input
# ============================================================


class TestGetDefaultInput:
    """测试默认输入参数获取"""

    def test_returns_valid_input(self):
        """测试返回有效的输入参数"""
        result = get_default_input()

        assert isinstance(result, CostCalculationInput)
        assert result.functional.device_count == 10
        assert result.functional.recording_mode == RecordingMode.EVENT_TRIGGERED
        assert result.functional.video_quality == VideoQuality.P1080
        assert result.functional.retention_days == 30

    def test_default_technical_dimensions(self):
        """测试默认技术维度"""
        result = get_default_input()

        assert result.technical.storage_class == StorageClass.STANDARD
        assert result.technical.lifecycle_policy is None

    def test_default_pricing_dimensions(self):
        """测试默认价格维度"""
        result = get_default_input()

        assert result.pricing.region == "us-east-1"
        assert result.pricing.discount_percent == 0.0


# ============================================================
# 测试 determine_storage_strategy
# ============================================================


class TestDetermineStorageStrategy:
    """测试存储策略判断"""

    def test_single_standard_storage(self):
        """测试单一 Standard 存储"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=10,
                retention_days=30,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
                lifecycle_policy=None,
            ),
            pricing=PricingDimensions(region="us-east-1"),
        )

        result = determine_storage_strategy(input_data)
        assert result == StorageStrategy.SINGLE_STANDARD

    def test_single_glacier_ir_storage(self):
        """测试单一 Glacier IR 存储"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=10,
                retention_days=30,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.GLACIER_IR,
                lifecycle_policy=None,
            ),
            pricing=PricingDimensions(region="us-east-1"),
        )

        result = determine_storage_strategy(input_data)
        assert result == StorageStrategy.SINGLE_GLACIER_IR

    def test_lifecycle_disabled(self):
        """测试禁用生命周期策略"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=10,
                retention_days=30,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
                lifecycle_policy=LifecyclePolicy(enabled=False),
            ),
            pricing=PricingDimensions(region="us-east-1"),
        )

        result = determine_storage_strategy(input_data)
        assert result == StorageStrategy.SINGLE_STANDARD

    def test_lifecycle_simple_mode(self):
        """测试简单生命周期策略"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=10,
                retention_days=30,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
                lifecycle_policy=LifecyclePolicy(
                    enabled=True,
                    transition_days=7,
                    target_class=StorageClass.GLACIER_IR,
                ),
            ),
            pricing=PricingDimensions(region="us-east-1"),
        )

        result = determine_storage_strategy(input_data)
        assert result == StorageStrategy.LIFECYCLE_STANDARD_TO_GLACIER

    def test_lifecycle_multi_stage(self):
        """测试多阶段生命周期策略"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=10,
                retention_days=30,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
                lifecycle_policy=LifecyclePolicy(
                    enabled=True,
                    stages=[
                        LifecycleStage(
                            start_day=1, end_day=7, storage_class=StorageClass.STANDARD
                        ),
                        LifecycleStage(
                            start_day=8, end_day=30, storage_class=StorageClass.GLACIER_IR
                        ),
                    ],
                ),
            ),
            pricing=PricingDimensions(region="us-east-1"),
        )

        result = determine_storage_strategy(input_data)
        assert result == StorageStrategy.LIFECYCLE_MULTI_STAGE


# ============================================================
# 测试数据模型
# ============================================================


class TestCalculationRecordModels:
    """测试核算记录数据模型"""

    def test_create_request_validation(self):
        """测试创建请求验证"""
        request = CreateCalculationRecordRequest(
            name="测试记录",
            description="测试描述",
            functional=FunctionalDimensions(device_count=10, retention_days=30),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="us-east-1"),
        )

        assert request.name == "测试记录"
        assert request.description == "测试描述"
        assert request.functional.device_count == 10

    def test_create_request_name_too_long(self):
        """测试名称过长验证"""
        with pytest.raises(ValueError):
            CreateCalculationRecordRequest(
                name="a" * 101,  # 超过 100 字符
                functional=FunctionalDimensions(device_count=10, retention_days=30),
                technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
                pricing=PricingDimensions(region="us-east-1"),
            )

    def test_create_request_empty_name(self):
        """测试空名称验证"""
        with pytest.raises(ValueError):
            CreateCalculationRecordRequest(
                name="",  # 空名称
                functional=FunctionalDimensions(device_count=10, retention_days=30),
                technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
                pricing=PricingDimensions(region="us-east-1"),
            )

    def test_functional_dimension_snapshot(self):
        """测试功能维度快照"""
        snapshot = FunctionalDimensionSnapshot(
            device_count=100,
            recording_mode="event_triggered",
            video_quality="1080p",
            retention_days=30,
            access_pattern=0.1,
        )

        assert snapshot.device_count == 100
        assert snapshot.recording_mode == "event_triggered"
        assert snapshot.video_quality == "1080p"

    def test_technical_dimension_snapshot(self):
        """测试技术维度快照"""
        snapshot = TechnicalDimensionSnapshot(
            storage_class="STANDARD",
            segment_strategy="fixed_duration",
            segment_seconds=10,
            lifecycle_enabled=False,
        )

        assert snapshot.storage_class == "STANDARD"
        assert snapshot.segment_strategy == "fixed_duration"

    def test_pricing_dimension_snapshot(self):
        """测试价格维度快照"""
        snapshot = PricingDimensionSnapshot(
            region="us-east-1",
            region_name="美国东部（弗吉尼亚）",
            discount_percent=10.0,
        )

        assert snapshot.region == "us-east-1"
        assert snapshot.discount_percent == 10.0

    def test_intermediate_metrics_detail(self):
        """测试中间指标详情"""
        metrics = IntermediateMetricsDetail(
            daily_data_gb=1.5,
            avg_storage_gb=45.0,
            monthly_puts=432000,
            monthly_gets=43200,
            monthly_retrieval_gb=4.5,
            monthly_transfer_gb=4.5,
        )

        assert metrics.daily_data_gb == 1.5
        assert metrics.avg_storage_gb == 45.0

    def test_calculation_record_summary(self):
        """测试核算记录摘要"""
        summary = CalculationRecordSummary(
            record_id="rec_123",
            name="测试记录",
            storage_strategy=StorageStrategy.SINGLE_STANDARD,
            total_cost=100.0,
            created_at=datetime.now(),
        )

        assert summary.record_id == "rec_123"
        assert summary.name == "测试记录"

    def test_calculation_record_list_response(self):
        """测试核算记录列表响应"""
        response = CalculationRecordListResponse(
            items=[],
            total=0,
            page=1,
            page_size=20,
        )

        assert response.total == 0
        assert response.total_pages == 0

    def test_calculation_record_list_response_pagination(self):
        """测试核算记录列表分页计算"""
        response = CalculationRecordListResponse(
            items=[],
            total=55,
            page=1,
            page_size=20,
        )

        assert response.total_pages == 3  # ceil(55/20) = 3


# ============================================================
# 测试存储策略枚举
# ============================================================


class TestStorageStrategyEnum:
    """测试存储策略枚举"""

    def test_all_strategies(self):
        """测试所有存储策略值"""
        assert StorageStrategy.SINGLE_STANDARD.value == "single_standard"
        assert StorageStrategy.SINGLE_GLACIER_IR.value == "single_glacier_ir"
        assert StorageStrategy.LIFECYCLE_STANDARD_TO_GLACIER.value == "lifecycle_std_glacier"
        assert StorageStrategy.LIFECYCLE_MULTI_STAGE.value == "lifecycle_multi_stage"

    def test_strategy_from_string(self):
        """测试从字符串创建策略"""
        strategy = StorageStrategy("single_standard")
        assert strategy == StorageStrategy.SINGLE_STANDARD
