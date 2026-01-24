"""三类维度数据模型

定义 IPC 云存储成本评估系统的三类维度：
1. FunctionalDimensions - 功能维度：业务场景相关参数
2. TechnicalDimensions - 技术维度：方案选型相关参数
3. PricingDimensions - 价格模型维度：AWS 定价相关参数

这三类维度共同构成成本计算的输入参数。
"""
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import (
    RecordingMode,
    VideoQuality,
    SegmentStrategy,
    StorageClass,
    PricingModel,
)


class LifecyclePolicy(BaseModel):
    """生命周期策略

    定义 S3 对象的生命周期转换策略。
    可用于将对象从一个存储类自动转换到另一个存储类。

    Attributes:
        enabled: 是否启用生命周期策略
        transition_days: 转换天数，对象创建后多少天进行转换
        target_class: 目标存储类型
    """

    enabled: bool = False
    transition_days: int = Field(
        default=7,
        ge=1,
        description="转换天数，对象创建后多少天进行转换",
    )
    target_class: StorageClass = StorageClass.GLACIER_IR


class FunctionalDimensions(BaseModel):
    """功能维度 - 业务场景相关参数

    定义与业务需求相关的参数，包括设备数量、录像模式、
    视频质量、访问模式等。这些参数决定了存储需求的规模。

    Attributes:
        device_count: 设备数量
        recording_mode: 录像模式（全天候/事件触发/定时段）
        video_quality: 视频质量（720p/1080p/2K/4K）
        access_pattern: 回看比例，0.0-1.0 表示回看请求占比
        retention_days: 存储保留天数
        events_per_day: 每日事件数（事件触发模式）
        event_duration_sec: 事件时长（秒）
        scheduled_hours: 每日录像小时数（定时段模式）
        segment_strategy: 分片传输策略
        segment_value: 分片值（秒或 MB，取决于策略）
    """

    device_count: int = Field(
        ...,
        ge=1,
        description="设备数量",
    )
    recording_mode: RecordingMode = Field(
        default=RecordingMode.EVENT_TRIGGERED,
        description="录像模式",
    )
    video_quality: VideoQuality = Field(
        default=VideoQuality.P1080,
        description="视频质量",
    )
    access_pattern: float = Field(
        default=0.1,
        ge=0.0,
        le=1.0,
        description="回看比例，0.0-1.0",
    )
    retention_days: int = Field(
        default=30,
        ge=1,
        le=365,
        description="存储保留天数",
    )
    events_per_day: Optional[int] = Field(
        default=400,
        ge=0,
        description="每日事件数（事件触发模式）",
    )
    event_duration_sec: Optional[int] = Field(
        default=15,
        ge=1,
        description="事件时长（秒）",
    )
    scheduled_hours: Optional[float] = Field(
        default=12,
        ge=0,
        le=24,
        description="每日录像小时数（定时段模式）",
    )
    segment_strategy: SegmentStrategy = Field(
        default=SegmentStrategy.FIXED_DURATION,
        description="分片传输策略",
    )
    segment_value: int = Field(
        default=15,
        ge=1,
        description="分片值（秒或 MB，取决于策略）",
    )

    @property
    def data_rate_kb(self) -> float:
        """获取数据速率 (KB/s)

        从视频质量枚举中获取对应的数据速率。

        Returns:
            数据速率，单位 KB/s
        """
        return self.video_quality.data_rate_kb


class TechnicalDimensions(BaseModel):
    """技术维度 - 方案选型相关参数

    定义与技术方案相关的参数，包括存储类型和生命周期策略。
    这些参数决定了使用何种 AWS S3 存储方案。

    Attributes:
        storage_class: S3 存储类型
        lifecycle_policy: 生命周期策略配置
    """

    storage_class: StorageClass = Field(
        default=StorageClass.STANDARD,
        description="S3 存储类型",
    )
    lifecycle_policy: Optional[LifecyclePolicy] = Field(
        default=None,
        description="生命周期策略配置",
    )


class PricingDimensions(BaseModel):
    """价格模型维度 - AWS 定价相关参数

    定义与 AWS 定价相关的参数，包括区域、折扣和计费模式。
    这些参数影响最终的成本计算结果。

    Attributes:
        region: AWS 区域代码
        discount_percent: 折扣比例，0.0-0.5 表示最高 50% 折扣
        pricing_model: 计费模式（按需/预留）
    """

    region: str = Field(
        default="ap-northeast-1",
        description="AWS 区域代码",
    )
    discount_percent: float = Field(
        default=0.0,
        ge=0.0,
        le=0.5,
        description="折扣比例，0.0-0.5",
    )
    pricing_model: PricingModel = Field(
        default=PricingModel.ON_DEMAND,
        description="计费模式",
    )


class CostCalculationInput(BaseModel):
    """成本计算输入 - 包含三类维度

    组合三类维度作为成本计算的完整输入。
    技术维度和价格模型维度有默认值，功能维度必须提供。

    Attributes:
        functional: 功能维度配置
        technical: 技术维度配置
        pricing: 价格模型维度配置
    """

    functional: FunctionalDimensions
    technical: TechnicalDimensions = Field(default_factory=TechnicalDimensions)
    pricing: PricingDimensions = Field(default_factory=PricingDimensions)
