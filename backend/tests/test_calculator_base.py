"""基础计算器测试

测试 BaseCalculator 类的所有静态方法：
- 每日数据量计算
- 平均存储量计算
- 月度请求数计算
- 月度检索数据量计算
"""
import pytest

from app.services.calculator.base import BaseCalculator
from app.models.dimensions import FunctionalDimensions
from app.models.enums import RecordingMode, VideoQuality, SegmentStrategy


class TestCalculateDailyDataGb:
    """测试每日数据量计算"""

    @pytest.fixture
    def event_triggered_dims(self) -> FunctionalDimensions:
        """事件触发模式的功能维度"""
        return FunctionalDimensions(
            device_count=1000,
            recording_mode=RecordingMode.EVENT_TRIGGERED,
            video_quality=VideoQuality.P1080,
            events_per_day=400,
            event_duration_sec=15,
            retention_days=30,
            access_pattern=0.1,
            segment_strategy=SegmentStrategy.FIXED_DURATION,
            segment_value=15,
        )

    def test_event_triggered_mode(self, event_triggered_dims: FunctionalDimensions):
        """测试事件触发模式的每日数据量计算

        计算公式：设备数 x 数据率(KB/s) x 事件数 x 事件时长 / 1024 / 1024
        1000 x 312.5 x 400 x 15 / 1024 / 1024 = 1788.14 GB
        """
        daily_data = BaseCalculator.calculate_daily_data_gb(event_triggered_dims)
        assert daily_data == pytest.approx(1788.14, rel=0.01)

    def test_continuous_mode(self):
        """测试全天候模式的每日数据量计算

        计算公式：设备数 x 数据率(KB/s) x 86400秒 / 1024 / 1024
        100 x 312.5 x 86400 / 1024 / 1024 = 2574.46 GB
        """
        dims = FunctionalDimensions(
            device_count=100,
            recording_mode=RecordingMode.CONTINUOUS,
            video_quality=VideoQuality.P1080,
            retention_days=30,
        )
        daily_data = BaseCalculator.calculate_daily_data_gb(dims)
        assert daily_data == pytest.approx(2574.46, rel=0.01)

    def test_scheduled_mode(self):
        """测试定时段模式的每日数据量计算

        计算公式：设备数 x 数据率(KB/s) x 小时数 x 3600 / 1024 / 1024
        100 x 312.5 x 12 x 3600 / 1024 / 1024 = 1287.23 GB
        """
        dims = FunctionalDimensions(
            device_count=100,
            recording_mode=RecordingMode.SCHEDULED,
            video_quality=VideoQuality.P1080,
            scheduled_hours=12,
            retention_days=30,
        )
        daily_data = BaseCalculator.calculate_daily_data_gb(dims)
        assert daily_data == pytest.approx(1287.23, rel=0.01)

    def test_different_video_qualities(self):
        """测试不同视频质量的数据率"""
        base_dims = {
            "device_count": 100,
            "recording_mode": RecordingMode.CONTINUOUS,
            "retention_days": 30,
        }

        # 720p: 125 KB/s
        dims_720p = FunctionalDimensions(video_quality=VideoQuality.P720, **base_dims)
        daily_720p = BaseCalculator.calculate_daily_data_gb(dims_720p)
        assert daily_720p == pytest.approx(1029.78, rel=0.01)

        # 2K: 625 KB/s
        dims_2k = FunctionalDimensions(video_quality=VideoQuality.P2K, **base_dims)
        daily_2k = BaseCalculator.calculate_daily_data_gb(dims_2k)
        assert daily_2k == pytest.approx(5148.93, rel=0.01)

        # 4K: 1500 KB/s
        dims_4k = FunctionalDimensions(video_quality=VideoQuality.P4K, **base_dims)
        daily_4k = BaseCalculator.calculate_daily_data_gb(dims_4k)
        assert daily_4k == pytest.approx(12357.42, rel=0.01)

    def test_zero_events(self):
        """测试事件数为 0 的情况"""
        dims = FunctionalDimensions(
            device_count=100,
            recording_mode=RecordingMode.EVENT_TRIGGERED,
            video_quality=VideoQuality.P1080,
            events_per_day=0,
            event_duration_sec=15,
            retention_days=30,
        )
        daily_data = BaseCalculator.calculate_daily_data_gb(dims)
        assert daily_data == 0.0

    def test_zero_scheduled_hours(self):
        """测试定时段小时数为 0 的情况"""
        dims = FunctionalDimensions(
            device_count=100,
            recording_mode=RecordingMode.SCHEDULED,
            video_quality=VideoQuality.P1080,
            scheduled_hours=0,
            retention_days=30,
        )
        daily_data = BaseCalculator.calculate_daily_data_gb(dims)
        assert daily_data == 0.0


class TestCalculateAvgStorageGb:
    """测试平均存储量计算"""

    def test_basic_calculation(self):
        """测试基本平均存储量计算

        计算公式：每日数据量 x 保留天数
        100 x 30 = 3000 GB
        """
        daily_data = 100.0
        retention_days = 30
        avg_storage = BaseCalculator.calculate_avg_storage_gb(daily_data, retention_days)
        assert avg_storage == 3000.0

    def test_various_retention_periods(self):
        """测试不同保留期的存储量"""
        daily_data = 50.0

        assert BaseCalculator.calculate_avg_storage_gb(daily_data, 7) == 350.0
        assert BaseCalculator.calculate_avg_storage_gb(daily_data, 30) == 1500.0
        assert BaseCalculator.calculate_avg_storage_gb(daily_data, 90) == 4500.0
        assert BaseCalculator.calculate_avg_storage_gb(daily_data, 365) == 18250.0

    def test_zero_daily_data(self):
        """测试每日数据量为 0 的情况"""
        avg_storage = BaseCalculator.calculate_avg_storage_gb(0.0, 30)
        assert avg_storage == 0.0


class TestCalculateDailyRecordingSeconds:
    """测试每日录像秒数计算"""

    def test_continuous_mode(self):
        """全天候模式返回 86400 秒"""
        dims = FunctionalDimensions(
            device_count=100,
            recording_mode=RecordingMode.CONTINUOUS,
            video_quality=VideoQuality.P1080,
            retention_days=30,
        )
        seconds = BaseCalculator.calculate_daily_recording_seconds(dims)
        assert seconds == 86400

    def test_event_triggered_mode(self):
        """事件触发模式返回 事件数 x 事件时长"""
        dims = FunctionalDimensions(
            device_count=100,
            recording_mode=RecordingMode.EVENT_TRIGGERED,
            video_quality=VideoQuality.P1080,
            events_per_day=400,
            event_duration_sec=15,
            retention_days=30,
        )
        seconds = BaseCalculator.calculate_daily_recording_seconds(dims)
        assert seconds == 6000  # 400 x 15

    def test_scheduled_mode(self):
        """定时段模式返回 小时数 x 3600"""
        dims = FunctionalDimensions(
            device_count=100,
            recording_mode=RecordingMode.SCHEDULED,
            video_quality=VideoQuality.P1080,
            scheduled_hours=12,
            retention_days=30,
        )
        seconds = BaseCalculator.calculate_daily_recording_seconds(dims)
        assert seconds == 43200  # 12 x 3600


class TestCalculateSegmentsPerDay:
    """测试每日分片数计算"""

    def test_fixed_duration_strategy(self):
        """测试固定时长分片策略

        事件触发：400事件 x 15秒 = 6000秒
        每 15 秒一个分片 = 400 个分片
        """
        dims = FunctionalDimensions(
            device_count=1000,
            recording_mode=RecordingMode.EVENT_TRIGGERED,
            video_quality=VideoQuality.P1080,
            events_per_day=400,
            event_duration_sec=15,
            retention_days=30,
            segment_strategy=SegmentStrategy.FIXED_DURATION,
            segment_value=15,
        )
        daily_data = BaseCalculator.calculate_daily_data_gb(dims)
        segments = BaseCalculator.calculate_segments_per_day(dims, daily_data)
        assert segments == 400.0  # 6000 / 15

    def test_fixed_size_strategy(self):
        """测试固定大小分片策略

        每设备每日数据量 = 总数据量 / 设备数
        分片数 = 每设备数据量(KB) / 分片大小(KB)
        """
        dims = FunctionalDimensions(
            device_count=100,
            recording_mode=RecordingMode.CONTINUOUS,
            video_quality=VideoQuality.P1080,
            retention_days=30,
            segment_strategy=SegmentStrategy.FIXED_SIZE,
            segment_value=1024,  # 1 MB = 1024 KB
        )
        daily_data = BaseCalculator.calculate_daily_data_gb(dims)
        segments = BaseCalculator.calculate_segments_per_day(dims, daily_data)

        # 每设备每日数据：2574.46 / 100 = 25.74 GB = 26357.76 MB
        # 分片数：26357.76 / 1 = 26357.76
        expected_segments = (daily_data / dims.device_count) * 1024 * 1024 / dims.segment_value
        assert segments == pytest.approx(expected_segments, rel=0.01)

    def test_realtime_stream_strategy(self):
        """测试实时流策略

        实时流模式下，分片数等于录像秒数
        """
        dims = FunctionalDimensions(
            device_count=100,
            recording_mode=RecordingMode.CONTINUOUS,
            video_quality=VideoQuality.P1080,
            retention_days=30,
            segment_strategy=SegmentStrategy.REALTIME_STREAM,
            segment_value=1,
        )
        daily_data = BaseCalculator.calculate_daily_data_gb(dims)
        segments = BaseCalculator.calculate_segments_per_day(dims, daily_data)
        assert segments == 86400  # 等于每日秒数

    def test_zero_segment_value(self):
        """测试分片值为 0 的边界情况"""
        dims = FunctionalDimensions(
            device_count=100,
            recording_mode=RecordingMode.CONTINUOUS,
            video_quality=VideoQuality.P1080,
            retention_days=30,
            segment_strategy=SegmentStrategy.FIXED_DURATION,
            segment_value=1,  # 最小值为 1
        )
        # 修改为 0 来测试边界情况
        dims_with_zero = dims.model_copy(update={"segment_value": 0})
        daily_data = BaseCalculator.calculate_daily_data_gb(dims)

        # 由于 Pydantic 验证，segment_value 最小为 1，这里手动测试边界
        # 当 segment_value 为 0 时，应返回 0 避免除零错误
        # 我们通过绕过验证来测试
        segments = BaseCalculator.calculate_segments_per_day(dims_with_zero, daily_data)
        assert segments == 0.0


class TestCalculateMonthlyPuts:
    """测试月度 PUT 请求数计算"""

    def test_event_triggered_scenario(self):
        """测试事件触发场景的月度 PUT 请求数

        计算公式：设备数 x 每日分片数 x 30
        1000设备 x 400分片 x 30天 = 12,000,000
        """
        dims = FunctionalDimensions(
            device_count=1000,
            recording_mode=RecordingMode.EVENT_TRIGGERED,
            video_quality=VideoQuality.P1080,
            events_per_day=400,
            event_duration_sec=15,
            retention_days=30,
            segment_strategy=SegmentStrategy.FIXED_DURATION,
            segment_value=15,
        )
        daily_data = BaseCalculator.calculate_daily_data_gb(dims)
        monthly_puts = BaseCalculator.calculate_monthly_puts(dims, daily_data)
        assert monthly_puts == pytest.approx(12_000_000, rel=0.01)

    def test_continuous_scenario(self):
        """测试全天候场景的月度 PUT 请求数

        100设备 x (86400/15)分片 x 30天 = 17,280,000
        """
        dims = FunctionalDimensions(
            device_count=100,
            recording_mode=RecordingMode.CONTINUOUS,
            video_quality=VideoQuality.P1080,
            retention_days=30,
            segment_strategy=SegmentStrategy.FIXED_DURATION,
            segment_value=15,
        )
        daily_data = BaseCalculator.calculate_daily_data_gb(dims)
        monthly_puts = BaseCalculator.calculate_monthly_puts(dims, daily_data)
        expected = 100 * (86400 / 15) * 30
        assert monthly_puts == pytest.approx(expected, rel=0.01)


class TestCalculateMonthlyGets:
    """测试月度 GET 请求数计算"""

    def test_basic_calculation(self):
        """测试基本 GET 请求数计算

        计算公式：月度PUT数 x 访问比例
        12,000,000 x 0.1 = 1,200,000
        """
        dims = FunctionalDimensions(
            device_count=1000,
            recording_mode=RecordingMode.EVENT_TRIGGERED,
            video_quality=VideoQuality.P1080,
            events_per_day=400,
            event_duration_sec=15,
            retention_days=30,
            access_pattern=0.1,
            segment_strategy=SegmentStrategy.FIXED_DURATION,
            segment_value=15,
        )
        monthly_puts = 12_000_000
        monthly_gets = BaseCalculator.calculate_monthly_gets(dims, monthly_puts)
        assert monthly_gets == pytest.approx(1_200_000, rel=0.01)

    def test_different_access_patterns(self):
        """测试不同访问比例"""
        dims = FunctionalDimensions(
            device_count=100,
            recording_mode=RecordingMode.CONTINUOUS,
            video_quality=VideoQuality.P1080,
            retention_days=30,
            access_pattern=0.2,
        )
        monthly_puts = 1_000_000

        dims_10 = dims.model_copy(update={"access_pattern": 0.1})
        dims_50 = dims.model_copy(update={"access_pattern": 0.5})
        dims_100 = dims.model_copy(update={"access_pattern": 1.0})

        assert BaseCalculator.calculate_monthly_gets(dims_10, monthly_puts) == 100_000
        assert BaseCalculator.calculate_monthly_gets(dims_50, monthly_puts) == 500_000
        assert BaseCalculator.calculate_monthly_gets(dims_100, monthly_puts) == 1_000_000

    def test_zero_access_pattern(self):
        """测试访问比例为 0 的情况"""
        dims = FunctionalDimensions(
            device_count=100,
            recording_mode=RecordingMode.CONTINUOUS,
            video_quality=VideoQuality.P1080,
            retention_days=30,
            access_pattern=0.0,
        )
        monthly_gets = BaseCalculator.calculate_monthly_gets(dims, 1_000_000)
        assert monthly_gets == 0.0


class TestCalculateMonthlyRetrievalGb:
    """测试月度检索数据量计算"""

    def test_basic_calculation(self):
        """测试基本检索数据量计算

        计算公式：每日数据量 x 30 x 访问比例
        100 x 30 x 0.1 = 300 GB
        """
        daily_data = 100.0
        access_pattern = 0.1
        retrieval = BaseCalculator.calculate_monthly_retrieval_gb(daily_data, access_pattern)
        assert retrieval == 300.0

    def test_various_scenarios(self):
        """测试不同场景的检索数据量"""
        # 高数据量低访问
        assert BaseCalculator.calculate_monthly_retrieval_gb(500.0, 0.05) == 750.0

        # 低数据量高访问
        assert BaseCalculator.calculate_monthly_retrieval_gb(10.0, 0.5) == 150.0

        # 零访问
        assert BaseCalculator.calculate_monthly_retrieval_gb(100.0, 0.0) == 0.0

        # 全访问
        assert BaseCalculator.calculate_monthly_retrieval_gb(100.0, 1.0) == 3000.0


class TestCalculateMonthlyTransferGb:
    """测试月度数据传输量计算"""

    def test_equals_retrieval(self):
        """数据传输量等于检索数据量"""
        assert BaseCalculator.calculate_monthly_transfer_gb(300.0) == 300.0
        assert BaseCalculator.calculate_monthly_transfer_gb(0.0) == 0.0
        assert BaseCalculator.calculate_monthly_transfer_gb(1500.5) == 1500.5


class TestIntegrationScenarios:
    """集成测试场景"""

    def test_excel_reference_scenario(self):
        """测试 Excel 参考场景

        验证与原始 Excel 计算结果的一致性
        场景：1000设备，事件触发，1080p，400事件/天，15秒/事件
        """
        dims = FunctionalDimensions(
            device_count=1000,
            recording_mode=RecordingMode.EVENT_TRIGGERED,
            video_quality=VideoQuality.P1080,
            events_per_day=400,
            event_duration_sec=15,
            retention_days=30,
            access_pattern=0.1,
            segment_strategy=SegmentStrategy.FIXED_DURATION,
            segment_value=15,
        )

        # 计算各项指标
        daily_data = BaseCalculator.calculate_daily_data_gb(dims)
        avg_storage = BaseCalculator.calculate_avg_storage_gb(daily_data, dims.retention_days)
        monthly_puts = BaseCalculator.calculate_monthly_puts(dims, daily_data)
        monthly_gets = BaseCalculator.calculate_monthly_gets(dims, monthly_puts)
        monthly_retrieval = BaseCalculator.calculate_monthly_retrieval_gb(
            daily_data, dims.access_pattern
        )

        # 验证结果
        assert daily_data == pytest.approx(1788.14, rel=0.01)
        assert avg_storage == pytest.approx(53644.18, rel=0.01)
        assert monthly_puts == pytest.approx(12_000_000, rel=0.01)
        assert monthly_gets == pytest.approx(1_200_000, rel=0.01)
        assert monthly_retrieval == pytest.approx(5364.42, rel=0.01)

    def test_large_scale_scenario(self):
        """测试大规模场景

        10000设备的全天候录像场景
        """
        dims = FunctionalDimensions(
            device_count=10000,
            recording_mode=RecordingMode.CONTINUOUS,
            video_quality=VideoQuality.P4K,
            retention_days=90,
            access_pattern=0.05,
            segment_strategy=SegmentStrategy.FIXED_DURATION,
            segment_value=30,
        )

        daily_data = BaseCalculator.calculate_daily_data_gb(dims)
        avg_storage = BaseCalculator.calculate_avg_storage_gb(daily_data, dims.retention_days)

        # 10000 x 1500 x 86400 / 1024 / 1024 = 1235742.19 GB/天
        assert daily_data == pytest.approx(1235742.19, rel=0.01)
        # 1235742.19 x 90 = 111216796.88 GB
        assert avg_storage == pytest.approx(111216796.88, rel=0.01)
