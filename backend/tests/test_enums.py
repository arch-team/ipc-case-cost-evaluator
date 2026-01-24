"""枚举类型测试"""
from app.models.enums import (
    RecordingMode,
    VideoQuality,
    SegmentStrategy,
    StorageClass,
    PricingModel,
    SharePermission,
)


class TestRecordingMode:
    """录像模式枚举测试"""

    def test_recording_mode_values(self):
        """测试录像模式枚举值"""
        assert RecordingMode.CONTINUOUS.value == "continuous"
        assert RecordingMode.EVENT_TRIGGERED.value == "event_triggered"
        assert RecordingMode.SCHEDULED.value == "scheduled"

    def test_recording_mode_chinese_label(self):
        """测试录像模式中文标签"""
        assert RecordingMode.CONTINUOUS.label == "全天候"
        assert RecordingMode.EVENT_TRIGGERED.label == "事件触发"
        assert RecordingMode.SCHEDULED.label == "定时段"

    def test_recording_mode_is_string_enum(self):
        """测试录像模式继承自 str"""
        assert isinstance(RecordingMode.CONTINUOUS, str)
        assert RecordingMode.CONTINUOUS == "continuous"


class TestVideoQuality:
    """视频质量枚举测试"""

    def test_video_quality_values(self):
        """测试视频质量枚举值"""
        assert VideoQuality.P720.value == "720p"
        assert VideoQuality.P1080.value == "1080p"
        assert VideoQuality.P2K.value == "2K"
        assert VideoQuality.P4K.value == "4K"

    def test_video_quality_data_rate(self):
        """测试视频质量数据速率 (KB/s)"""
        assert VideoQuality.P720.data_rate_kb == 125
        assert VideoQuality.P1080.data_rate_kb == 312.5
        assert VideoQuality.P2K.data_rate_kb == 625
        assert VideoQuality.P4K.data_rate_kb == 1500

    def test_video_quality_spec(self):
        """测试视频质量规格"""
        spec_1080 = VideoQuality.P1080.spec
        assert spec_1080.resolution == "1920x1080"
        assert spec_1080.bitrate_kbps == 2500
        assert spec_1080.data_rate_kb == 312.5

    def test_video_quality_label(self):
        """测试视频质量标签"""
        assert VideoQuality.P1080.label == "1080p (1920x1080)"
        assert VideoQuality.P4K.label == "4K (3840x2160)"


class TestSegmentStrategy:
    """分片传输策略枚举测试"""

    def test_segment_strategy_values(self):
        """测试分片策略枚举值"""
        assert SegmentStrategy.FIXED_DURATION.value == "fixed_duration"
        assert SegmentStrategy.FIXED_SIZE.value == "fixed_size"
        assert SegmentStrategy.REALTIME_STREAM.value == "realtime_stream"

    def test_segment_strategy_label(self):
        """测试分片策略中文标签"""
        assert SegmentStrategy.FIXED_DURATION.label == "固定时长"
        assert SegmentStrategy.FIXED_SIZE.label == "固定大小"
        assert SegmentStrategy.REALTIME_STREAM.label == "实时流"


class TestStorageClass:
    """存储类型枚举测试"""

    def test_storage_class_values(self):
        """测试存储类型枚举值"""
        assert StorageClass.STANDARD.value == "STANDARD"
        assert StorageClass.GLACIER_IR.value == "GLACIER_IR"
        assert StorageClass.DEEP_ARCHIVE.value == "DEEP_ARCHIVE"

    def test_storage_class_label(self):
        """测试存储类型标签"""
        assert StorageClass.STANDARD.label == "S3 Standard"
        assert StorageClass.GLACIER_IR.label == "S3 Glacier Instant Retrieval"
        assert StorageClass.DEEP_ARCHIVE.label == "S3 Glacier Deep Archive"

    def test_storage_class_is_string_enum(self):
        """测试存储类型继承自 str"""
        assert isinstance(StorageClass.STANDARD, str)
        assert StorageClass.STANDARD == "STANDARD"


class TestPricingModel:
    """计费模式枚举测试"""

    def test_pricing_model_values(self):
        """测试计费模式枚举值"""
        assert PricingModel.ON_DEMAND.value == "on_demand"
        assert PricingModel.RESERVED.value == "reserved"

    def test_pricing_model_label(self):
        """测试计费模式中文标签"""
        assert PricingModel.ON_DEMAND.label == "按需付费"
        assert PricingModel.RESERVED.label == "预留容量"


class TestSharePermission:
    """分享权限枚举测试"""

    def test_share_permission_values(self):
        """测试分享权限枚举值"""
        assert SharePermission.VIEW.value == "VIEW"
        assert SharePermission.DUPLICATE.value == "DUPLICATE"
