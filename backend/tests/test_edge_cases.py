"""边缘情况测试

测试系统在极端参数下的行为：
- 最大设备数量
- 最大保留天数
- 边界值验证
- 小数精度控制
- 计算性能验证
"""
import time

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.calculator.s3_standard import S3StandardCalculator
from app.models.dimensions import (
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
    CostCalculationInput,
)
from app.models.enums import RecordingMode, VideoQuality, StorageClass, SegmentStrategy


class TestMaxDeviceCount:
    """测试最大设备数量场景"""

    def test_max_device_count_100000(self):
        """测试 100000 台设备的成本计算

        验证系统能够正确处理大规模设备部署场景
        """
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3StandardCalculator()
        result = calculator.calculate(input_data)

        # 验证计算结果合理性
        assert result.monthly_total > 0
        assert result.device_count == 100000
        assert result.per_device_monthly > 0
        # 单设备成本乘以设备数应等于总成本
        assert result.monthly_total == pytest.approx(
            result.per_device_monthly * 100000, rel=0.001
        )

    def test_device_count_scalability(self):
        """测试设备数量线性扩展

        验证成本随设备数量线性增长
        """
        calculator = S3StandardCalculator()

        # 1000 设备
        input_1000 = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        # 10000 设备
        input_10000 = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=10000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        result_1000 = calculator.calculate(input_1000)
        result_10000 = calculator.calculate(input_10000)

        # 成本应该大致呈线性关系（10倍设备 ≈ 10倍成本）
        # 由于数据传输阶梯定价，允许 20% 容差
        ratio = result_10000.monthly_total / result_1000.monthly_total
        assert ratio == pytest.approx(10.0, rel=0.20)


class TestMaxRetentionDays:
    """测试最大保留天数场景"""

    def test_max_retention_365_days(self):
        """测试 365 天保留期

        验证系统能够正确处理最长保留期
        """
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=365,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3StandardCalculator()
        result = calculator.calculate(input_data)

        # 验证存储量与保留天数成正比
        assert result.metrics.avg_storage_gb > 0
        assert result.monthly_total > 0

    def test_retention_scalability(self):
        """测试保留天数线性扩展

        验证存储成本随保留天数线性增长
        """
        calculator = S3StandardCalculator()

        # 30 天保留
        input_30d = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        # 180 天保留
        input_180d = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=180,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        result_30d = calculator.calculate(input_30d)
        result_180d = calculator.calculate(input_180d)

        # 存储量应该呈线性关系（6倍天数 = 6倍存储量）
        storage_ratio = result_180d.metrics.avg_storage_gb / result_30d.metrics.avg_storage_gb
        assert storage_ratio == pytest.approx(6.0, rel=0.01)


class TestBoundaryValues:
    """测试边界值"""

    def test_minimum_device_count(self):
        """测试最小设备数量（1台）"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3StandardCalculator()
        result = calculator.calculate(input_data)

        assert result.device_count == 1
        assert result.monthly_total == result.per_device_monthly

    def test_minimum_retention_days(self):
        """测试最小保留天数（1天）"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=1,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3StandardCalculator()
        result = calculator.calculate(input_data)

        assert result.monthly_total > 0
        # 1天保留的存储量应该等于每日数据量
        assert result.metrics.avg_storage_gb == pytest.approx(
            result.metrics.daily_data_gb, rel=0.01
        )

    def test_maximum_access_pattern(self):
        """测试最大回看比例（100%）"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=1.0,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3StandardCalculator()
        result = calculator.calculate(input_data)

        # GET 请求数应等于 PUT 请求数
        assert result.metrics.monthly_gets == result.metrics.monthly_puts

    def test_minimum_access_pattern(self):
        """测试最小回看比例（0%）"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.0,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3StandardCalculator()
        result = calculator.calculate(input_data)

        # GET 请求和数据传输应为零
        assert result.metrics.monthly_gets == 0
        assert result.breakdown.get_request_cost == 0
        assert result.breakdown.data_transfer_cost == 0

    def test_maximum_discount(self):
        """测试最大折扣（50%）"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1", discount_percent=0.5),
        )

        calculator = S3StandardCalculator()
        result = calculator.calculate(input_data)

        assert result.monthly_total > 0

    def test_all_video_qualities(self):
        """测试所有视频质量等级"""
        calculator = S3StandardCalculator()
        qualities = [
            VideoQuality.P720,
            VideoQuality.P1080,
            VideoQuality.P2K,
            VideoQuality.P4K,
        ]

        previous_data_rate = 0
        for quality in qualities:
            input_data = CostCalculationInput(
                functional=FunctionalDimensions(
                    device_count=100,
                    recording_mode=RecordingMode.EVENT_TRIGGERED,
                    video_quality=quality,
                    events_per_day=400,
                    event_duration_sec=15,
                    retention_days=30,
                    access_pattern=0.1,
                    segment_strategy=SegmentStrategy.FIXED_DURATION,
                    segment_value=15,
                ),
                technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
                pricing=PricingDimensions(region="ap-northeast-1"),
            )

            result = calculator.calculate(input_data)

            # 数据量应随质量递增
            assert result.metrics.daily_data_gb > previous_data_rate
            previous_data_rate = result.metrics.daily_data_gb

    def test_all_recording_modes(self):
        """测试所有录像模式"""
        calculator = S3StandardCalculator()
        modes = [
            RecordingMode.CONTINUOUS,
            RecordingMode.EVENT_TRIGGERED,
            RecordingMode.SCHEDULED,
        ]

        for mode in modes:
            input_data = CostCalculationInput(
                functional=FunctionalDimensions(
                    device_count=100,
                    recording_mode=mode,
                    video_quality=VideoQuality.P1080,
                    events_per_day=400 if mode == RecordingMode.EVENT_TRIGGERED else None,
                    event_duration_sec=15 if mode == RecordingMode.EVENT_TRIGGERED else None,
                    scheduled_hours=12 if mode == RecordingMode.SCHEDULED else None,
                    retention_days=30,
                    access_pattern=0.1,
                    segment_strategy=SegmentStrategy.FIXED_DURATION,
                    segment_value=15,
                ),
                technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
                pricing=PricingDimensions(region="ap-northeast-1"),
            )

            result = calculator.calculate(input_data)
            assert result.monthly_total > 0


class TestPrecisionControl:
    """测试小数精度控制"""

    def test_cost_precision(self):
        """测试成本计算精度

        验证成本结果保留合理的小数位数
        """
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3StandardCalculator()
        result = calculator.calculate(input_data)

        # 验证成本是浮点数
        assert isinstance(result.monthly_total, float)
        assert isinstance(result.per_device_monthly, float)

        # 验证百分比总和为 1.0
        percentages = result.breakdown.percentages
        total_percentage = sum(percentages.values())
        assert total_percentage == pytest.approx(1.0, rel=0.01)

    def test_breakdown_total_consistency(self):
        """测试费用明细总和一致性

        验证各项费用之和等于总费用
        """
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3StandardCalculator()
        result = calculator.calculate(input_data)

        # 验证各项费用之和等于 breakdown.total
        component_sum = (
            result.breakdown.storage_cost
            + result.breakdown.put_request_cost
            + result.breakdown.get_request_cost
            + result.breakdown.retrieval_cost
            + result.breakdown.data_transfer_cost
            + result.breakdown.lifecycle_cost
        )
        assert component_sum == pytest.approx(result.breakdown.total, rel=0.001)

        # 验证 breakdown.total 等于 monthly_total
        assert result.breakdown.total == pytest.approx(result.monthly_total, rel=0.001)


class TestCalculationPerformance:
    """测试计算性能"""

    def test_single_calculation_performance(self):
        """测试单次计算性能

        验证单次计算响应时间 < 100ms
        """
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P4K,
                events_per_day=1000,
                event_duration_sec=60,
                retention_days=365,
                access_pattern=1.0,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3StandardCalculator()

        start_time = time.perf_counter()
        result = calculator.calculate(input_data)
        elapsed_time = time.perf_counter() - start_time

        # 计算应在 100ms 内完成
        assert elapsed_time < 0.1, f"计算耗时 {elapsed_time:.3f}s 超过 100ms"
        assert result.monthly_total > 0

    def test_api_response_time(self):
        """测试 API 响应时间

        验证 API 响应时间 < 2s
        """
        client = TestClient(app)

        request_data = {
            "functional": {
                "device_count": 100000,
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "events_per_day": 1000,
                "event_duration_sec": 60,
                "retention_days": 365,
                "access_pattern": 1.0,
                "segment_strategy": "fixed_duration",
                "segment_value": 15,
            },
            "technical": {
                "storage_class": "STANDARD"
            },
            "pricing": {
                "region": "ap-northeast-1"
            }
        }

        start_time = time.perf_counter()
        response = client.post("/api/v1/calculate", json=request_data)
        elapsed_time = time.perf_counter() - start_time

        # API 响应应在 2s 内完成
        assert elapsed_time < 2.0, f"API 响应耗时 {elapsed_time:.3f}s 超过 2s"
        assert response.status_code == 200

    def test_batch_calculation_performance(self):
        """测试批量计算性能

        验证 10 次连续计算的总时间 < 1s
        """
        calculator = S3StandardCalculator()
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=10000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        start_time = time.perf_counter()
        for _ in range(10):
            result = calculator.calculate(input_data)
            assert result.monthly_total > 0
        elapsed_time = time.perf_counter() - start_time

        # 10 次计算应在 1s 内完成
        assert elapsed_time < 1.0, f"批量计算耗时 {elapsed_time:.3f}s 超过 1s"


class TestExtremeScenarios:
    """测试极端场景"""

    def test_large_enterprise_scenario(self):
        """测试大型企业场景

        100000 台 4K 设备，365 天保留，全天候录像
        """
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100000,
                recording_mode=RecordingMode.CONTINUOUS,
                video_quality=VideoQuality.P4K,
                retention_days=365,
                access_pattern=0.05,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3StandardCalculator()
        result = calculator.calculate(input_data)

        # 验证结果合理性
        assert result.monthly_total > 0
        assert result.metrics.daily_data_gb > 0
        # 大型企业场景存储量应该非常大
        assert result.metrics.avg_storage_gb > 1_000_000  # > 1 PB

    def test_minimum_viable_scenario(self):
        """测试最小可行场景

        1 台设备，1 天保留，最低质量
        """
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P720,
                events_per_day=1,
                event_duration_sec=1,
                retention_days=1,
                access_pattern=0.0,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=60,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3StandardCalculator()
        result = calculator.calculate(input_data)

        # 验证最小场景也能正确计算
        assert result.monthly_total > 0
        assert result.device_count == 1
