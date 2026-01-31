"""S3 Standard 计算器扩展测试

测试范围：
- calculator/s3_standard.py: S3 Standard 成本计算

注意：S3StandardCalculator.calculate() 只接受 input_data 参数，
定价数据通过内部的 pricing_service 获取。
"""
import pytest
from unittest.mock import MagicMock, patch

from app.models.dimensions import (
    CostCalculationInput,
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
)
from app.models.enums import RecordingMode, VideoQuality, SegmentStrategy, StorageClass
from app.services.calculator.s3_standard import S3StandardCalculator


class TestS3StandardCalculatorExtended:
    """S3 Standard 计算器扩展测试"""

    @pytest.fixture
    def event_triggered_input(self):
        """事件触发模式输入"""
        return CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                retention_days=30,
                events_per_day=50,
                event_duration_sec=30,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=10,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
            ),
            pricing=PricingDimensions(
                region="us-east-1",
                discount_percent=0.0,
            ),
        )

    @pytest.fixture
    def continuous_input(self):
        """全天候录像模式输入"""
        return CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=50,
                recording_mode=RecordingMode.CONTINUOUS,
                video_quality=VideoQuality.P720,
                retention_days=7,
                access_pattern=0.05,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=60,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
            ),
            pricing=PricingDimensions(
                region="us-east-1",
                discount_percent=0.0,
            ),
        )

    @pytest.fixture
    def scheduled_input(self):
        """定时录像模式输入"""
        return CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=20,
                recording_mode=RecordingMode.SCHEDULED,
                video_quality=VideoQuality.P4K,
                retention_days=14,
                scheduled_hours=8.0,
                access_pattern=0.2,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=30,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
            ),
            pricing=PricingDimensions(
                region="us-east-1",
                discount_percent=0.0,
            ),
        )

    def test_calculate_event_triggered(self, event_triggered_input):
        """测试事件触发模式计算"""
        calculator = S3StandardCalculator()
        result = calculator.calculate(event_triggered_input)

        assert result is not None
        assert result.monthly_total > 0
        assert result.breakdown.storage_cost > 0
        assert result.breakdown.put_request_cost > 0

    def test_calculate_continuous(self, continuous_input):
        """测试全天候录像模式计算"""
        calculator = S3StandardCalculator()
        result = calculator.calculate(continuous_input)

        assert result is not None
        assert result.monthly_total > 0
        # 全天候模式数据量应该更大
        assert result.metrics.daily_data_gb > 0

    def test_calculate_scheduled(self, scheduled_input):
        """测试定时录像模式计算"""
        calculator = S3StandardCalculator()
        result = calculator.calculate(scheduled_input)

        assert result is not None
        assert result.monthly_total > 0

    def test_calculate_with_discount(self, event_triggered_input):
        """测试带折扣的计算"""
        calculator = S3StandardCalculator()

        # 先计算无折扣
        result_no_discount = calculator.calculate(event_triggered_input)

        # 再计算有折扣
        event_triggered_input.pricing.discount_percent = 0.2  # 20% 折扣
        result_with_discount = calculator.calculate(event_triggered_input)

        # 有折扣的成本应该更低
        assert result_with_discount.monthly_total < result_no_discount.monthly_total

    def test_calculate_glacier_ir(self, event_triggered_input):
        """测试 Glacier IR 存储类型"""
        event_triggered_input.technical.storage_class = StorageClass.GLACIER_IR
        calculator = S3StandardCalculator()
        result = calculator.calculate(event_triggered_input)

        assert result is not None
        assert result.monthly_total > 0
        # Glacier IR 应该有检索费用（如果有回看）
        if event_triggered_input.functional.access_pattern > 0:
            assert result.breakdown.retrieval_cost >= 0

    def test_metrics_consistency(self, event_triggered_input):
        """测试指标一致性"""
        calculator = S3StandardCalculator()
        result = calculator.calculate(event_triggered_input)

        metrics = result.metrics

        # 验证指标之间的关系
        assert metrics.daily_data_gb > 0
        assert metrics.avg_storage_gb > 0
        assert metrics.monthly_puts > 0

        # 平均存储量应该等于每日数据量乘以保留天数
        expected_avg_storage = metrics.daily_data_gb * event_triggered_input.functional.retention_days
        assert abs(metrics.avg_storage_gb - expected_avg_storage) < 0.01

    def test_cost_breakdown_totals(self, event_triggered_input):
        """测试成本明细总和"""
        calculator = S3StandardCalculator()
        result = calculator.calculate(event_triggered_input)

        breakdown = result.breakdown

        # 总成本应该等于各项之和
        calculated_total = (
            breakdown.storage_cost
            + breakdown.put_request_cost
            + breakdown.get_request_cost
            + breakdown.retrieval_cost
            + breakdown.data_transfer_cost
            + breakdown.lifecycle_cost
        )

        assert abs(result.monthly_total - calculated_total) < 0.01

    def test_yearly_cost_calculation(self, event_triggered_input):
        """测试年度成本计算"""
        calculator = S3StandardCalculator()
        result = calculator.calculate(event_triggered_input)

        # 年度成本应该等于月度成本乘以 12
        expected_yearly = result.monthly_total * 12
        assert abs(result.yearly_total - expected_yearly) < 0.01

    def test_per_device_cost(self, event_triggered_input):
        """测试单设备成本计算"""
        calculator = S3StandardCalculator()
        result = calculator.calculate(event_triggered_input)

        # 单设备成本应该等于总成本除以设备数
        expected_per_device = result.monthly_total / event_triggered_input.functional.device_count
        assert abs(result.per_device_monthly - expected_per_device) < 0.01

    def test_different_video_qualities(self):
        """测试不同视频质量"""
        calculator = S3StandardCalculator()

        qualities = [VideoQuality.P720, VideoQuality.P1080, VideoQuality.P2K, VideoQuality.P4K]
        results = []

        for quality in qualities:
            input_data = CostCalculationInput(
                functional=FunctionalDimensions(
                    device_count=10,
                    recording_mode=RecordingMode.EVENT_TRIGGERED,
                    video_quality=quality,
                    retention_days=30,
                    events_per_day=50,
                    event_duration_sec=30,
                    access_pattern=0.1,
                ),
                technical=TechnicalDimensions(
                    storage_class=StorageClass.STANDARD,
                ),
                pricing=PricingDimensions(region="us-east-1"),
            )
            result = calculator.calculate(input_data)
            results.append(result.monthly_total)

        # 高质量视频应该成本更高
        assert results[0] < results[1] < results[2] < results[3]

    def test_different_retention_days(self):
        """测试不同保留天数"""
        calculator = S3StandardCalculator()

        retention_options = [7, 14, 30, 60, 90]
        results = []

        for days in retention_options:
            input_data = CostCalculationInput(
                functional=FunctionalDimensions(
                    device_count=100,
                    recording_mode=RecordingMode.EVENT_TRIGGERED,
                    video_quality=VideoQuality.P1080,
                    retention_days=days,
                    events_per_day=50,
                    event_duration_sec=30,
                    access_pattern=0.1,
                ),
                technical=TechnicalDimensions(
                    storage_class=StorageClass.STANDARD,
                ),
                pricing=PricingDimensions(region="us-east-1"),
            )
            result = calculator.calculate(input_data)
            results.append(result.monthly_total)

        # 保留天数越长，成本应该越高
        for i in range(len(results) - 1):
            assert results[i] < results[i + 1]

    def test_zero_access_pattern(self, event_triggered_input):
        """测试零回看比例"""
        event_triggered_input.functional.access_pattern = 0.0
        calculator = S3StandardCalculator()
        result = calculator.calculate(event_triggered_input)

        assert result is not None
        # 零回看时，GET 请求、检索和传输费用应该为 0
        assert result.breakdown.get_request_cost == 0
        assert result.breakdown.data_transfer_cost == 0

    def test_high_access_pattern(self, event_triggered_input):
        """测试高回看比例"""
        event_triggered_input.functional.access_pattern = 1.0  # 100% 回看
        calculator = S3StandardCalculator()
        result = calculator.calculate(event_triggered_input)

        assert result is not None
        assert result.breakdown.get_request_cost > 0
        assert result.breakdown.data_transfer_cost > 0
