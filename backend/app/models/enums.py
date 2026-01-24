"""枚举类型定义

定义 IPC 云存储成本评估系统使用的所有枚举类型。
包括录像模式、视频质量、存储类型等业务相关枚举。
"""
from enum import Enum
from typing import NamedTuple


class LabeledEnum(str, Enum):
    """带标签的枚举基类"""

    @property
    def label(self) -> str:
        """获取枚举标签"""
        return self._get_labels().get(self.value, self.value)

    def _get_labels(self) -> dict:
        """子类需要实现此方法返回标签字典"""
        return {}


class RecordingMode(LabeledEnum):
    """录像模式

    定义 IPC 设备支持的录像模式类型。
    继承自 str 以便于 JSON 序列化和 API 响应。

    Attributes:
        CONTINUOUS: 全天候录像，24小时不间断
        EVENT_TRIGGERED: 事件触发录像，仅在检测到事件时录像
        SCHEDULED: 定时段录像，按预设时间段录像
    """
    CONTINUOUS = "continuous"
    EVENT_TRIGGERED = "event_triggered"
    SCHEDULED = "scheduled"

    def _get_labels(self) -> dict:
        """获取中文标签映射"""
        return {
            "continuous": "全天候",
            "event_triggered": "事件触发",
            "scheduled": "定时段",
        }


class VideoQualitySpec(NamedTuple):
    """视频质量规格

    Attributes:
        resolution: 分辨率，如 "1920x1080"
        bitrate_kbps: 比特率 (kbps)
        data_rate_kb: 数据速率 (KB/s)
    """
    resolution: str
    bitrate_kbps: int
    data_rate_kb: float


class VideoQuality(str, Enum):
    """视频质量

    定义 IPC 设备支持的视频质量等级。
    每个等级对应特定的分辨率、比特率和数据速率。

    Attributes:
        P720: 720p 高清 (1280x720)
        P1080: 1080p 全高清 (1920x1080)
        P2K: 2K 超清 (2560x1440)
        P4K: 4K 超高清 (3840x2160)
    """
    P720 = "720p"
    P1080 = "1080p"
    P2K = "2K"
    P4K = "4K"

    @property
    def spec(self) -> VideoQualitySpec:
        """获取视频质量规格详情"""
        # 视频质量规格映射表
        specs = {
            "720p": VideoQualitySpec("1280x720", 1000, 125),
            "1080p": VideoQualitySpec("1920x1080", 2500, 312.5),
            "2K": VideoQualitySpec("2560x1440", 5000, 625),
            "4K": VideoQualitySpec("3840x2160", 12000, 1500),
        }
        return specs[self.value]

    @property
    def data_rate_kb(self) -> float:
        """获取数据速率 (KB/s)"""
        return self.spec.data_rate_kb

    @property
    def label(self) -> str:
        """获取带分辨率的标签"""
        return f"{self.value} ({self.spec.resolution})"


class SegmentStrategy(LabeledEnum):
    """分片传输策略

    定义视频数据上传到 S3 时的分片策略。
    不同策略影响 PUT 请求数量和成本。

    Attributes:
        FIXED_DURATION: 固定时长分片，如每 10 秒一个分片
        FIXED_SIZE: 固定大小分片，如每 1MB 一个分片
        REALTIME_STREAM: 实时流传输，持续上传
    """
    FIXED_DURATION = "fixed_duration"
    FIXED_SIZE = "fixed_size"
    REALTIME_STREAM = "realtime_stream"

    def _get_labels(self) -> dict:
        """获取中文标签映射"""
        return {
            "fixed_duration": "固定时长",
            "fixed_size": "固定大小",
            "realtime_stream": "实时流",
        }


class StorageClass(LabeledEnum):
    """S3 存储类型

    定义 AWS S3 支持的存储类型。
    不同存储类型有不同的定价和访问特性。

    Attributes:
        STANDARD: S3 Standard，标准存储，适合频繁访问
        GLACIER_IR: S3 Glacier Instant Retrieval，即时检索归档存储
        DEEP_ARCHIVE: S3 Glacier Deep Archive，深度归档存储
    """
    STANDARD = "STANDARD"
    GLACIER_IR = "GLACIER_IR"
    DEEP_ARCHIVE = "DEEP_ARCHIVE"

    def _get_labels(self) -> dict:
        """获取存储类型全称映射"""
        return {
            "STANDARD": "S3 Standard",
            "GLACIER_IR": "S3 Glacier Instant Retrieval",
            "DEEP_ARCHIVE": "S3 Glacier Deep Archive",
        }


class PricingModel(LabeledEnum):
    """计费模式

    定义 AWS S3 的计费模式。

    Attributes:
        ON_DEMAND: 按需付费，按实际使用量计费
        RESERVED: 预留容量，预付费享受折扣
    """
    ON_DEMAND = "on_demand"
    RESERVED = "reserved"

    def _get_labels(self) -> dict:
        """获取中文标签映射"""
        return {
            "on_demand": "按需付费",
            "reserved": "预留容量",
        }


class SharePermission(str, Enum):
    """分享权限

    定义评估场景的分享权限类型。

    Attributes:
        VIEW: 仅查看，只能查看评估结果
        DUPLICATE: 可复制，可以复制评估场景进行修改
    """
    VIEW = "VIEW"
    DUPLICATE = "DUPLICATE"
