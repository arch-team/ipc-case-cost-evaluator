"""三类维度数据模型

定义 IPC 云存储成本评估系统的三类维度：
1. FunctionalDimensions - 功能维度：业务场景相关参数
2. TechnicalDimensions - 技术维度：方案选型相关参数
3. PricingDimensions - 价格模型维度：AWS 定价相关参数

这三类维度共同构成成本计算的输入参数。
"""
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, model_validator

from app.models.enums import (
    RecordingMode,
    VideoQuality,
    SegmentStrategy,
    StorageClass,
    PricingModel,
)


class AccessPatternStage(BaseModel):
    """访问模式阶段

    定义某个时间段内的回看比例。

    Attributes:
        start_day: 开始天数（从第 1 天起）
        end_day: 结束天数
        access_rate: 该阶段的访问比例 (0.0-1.0)
    """

    start_day: int = Field(
        ...,
        ge=1,
        description="开始天数（从第 1 天起）",
    )
    end_day: int = Field(
        ...,
        ge=1,
        description="结束天数",
    )
    access_rate: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="该阶段的访问比例 (0.0-1.0)",
    )

    @property
    def duration_days(self) -> int:
        """获取阶段持续天数"""
        return self.end_day - self.start_day + 1

    @model_validator(mode="after")
    def validate_day_range(self) -> "AccessPatternStage":
        """验证天数范围的有效性"""
        if self.end_day < self.start_day:
            raise ValueError(
                f"结束天数 ({self.end_day}) 不能小于开始天数 ({self.start_day})"
            )
        return self


class AccessPatternConfig(BaseModel):
    """访问模式配置

    支持两种模式：
    1. 简单模式：使用单一的全局 access_pattern（向后兼容）
    2. 时间衰减模式：分阶段定义不同的访问比例

    Attributes:
        mode: 模式类型 - 'simple' 或 'time_decay'
        stages: 多阶段访问配置（time_decay 模式）
        decay_preset: 预设衰减模式 ID（可选）
    """

    mode: Literal["simple", "time_decay"] = Field(
        default="simple",
        description="访问模式: simple (单一比例) 或 time_decay (时间衰减)",
    )
    stages: Optional[List[AccessPatternStage]] = Field(
        default=None,
        description="多阶段访问配置（time_decay 模式）",
    )
    decay_preset: Optional[str] = Field(
        default=None,
        description="预设衰减模式 ID",
    )

    @model_validator(mode="after")
    def validate_stages_continuity(self) -> "AccessPatternConfig":
        """验证阶段连续性"""
        if self.mode == "time_decay" and self.stages:
            sorted_stages = sorted(self.stages, key=lambda s: s.start_day)

            # 验证第一阶段从第 1 天开始
            if sorted_stages[0].start_day != 1:
                raise ValueError("第一个阶段必须从第 1 天开始")

            # 验证阶段连续性
            for i in range(1, len(sorted_stages)):
                prev_end = sorted_stages[i - 1].end_day
                curr_start = sorted_stages[i].start_day
                if curr_start != prev_end + 1:
                    raise ValueError(
                        f"阶段不连续：阶段 {i} 结束于第 {prev_end} 天，"
                        f"阶段 {i + 1} 开始于第 {curr_start} 天"
                    )

            self.stages = sorted_stages
        return self


class LifecycleStage(BaseModel):
    """生命周期阶段

    表示存储周期中的单个阶段，定义该阶段的时间范围和存储类型。

    Attributes:
        start_day: 开始天数（从第 1 天起）
        end_day: 结束天数
        storage_class: 该阶段使用的存储类型
    """

    start_day: int = Field(
        ...,
        ge=1,
        description="开始天数（从第 1 天起）",
    )
    end_day: int = Field(
        ...,
        ge=1,
        description="结束天数",
    )
    storage_class: StorageClass = Field(
        ...,
        description="该阶段使用的存储类型",
    )

    @property
    def duration_days(self) -> int:
        """获取阶段持续天数"""
        return self.end_day - self.start_day + 1

    @model_validator(mode="after")
    def validate_day_range(self) -> "LifecycleStage":
        """验证天数范围的有效性"""
        if self.end_day < self.start_day:
            raise ValueError(
                f"结束天数 ({self.end_day}) 不能小于开始天数 ({self.start_day})"
            )
        return self


class LifecyclePolicy(BaseModel):
    """生命周期策略

    定义 S3 对象的生命周期转换策略。
    支持两种模式：
    1. 简单模式：单一转换（enabled + transition_days + target_class）
    2. 多阶段模式：多个存储阶段（stages）

    Attributes:
        enabled: 是否启用生命周期策略
        transition_days: 转换天数（简单模式）
        target_class: 目标存储类型（简单模式）
        stages: 多阶段配置列表（多阶段模式）
        template_id: 使用的预设模板 ID（可选）
    """

    enabled: bool = False
    transition_days: int = Field(
        default=7,
        ge=1,
        description="转换天数，对象创建后多少天进行转换",
    )
    target_class: StorageClass = StorageClass.GLACIER_IR
    stages: Optional[List[LifecycleStage]] = Field(
        default=None,
        description="多阶段配置列表，如果设置则使用多阶段模式",
    )
    template_id: Optional[str] = Field(
        default=None,
        description="使用的预设模板 ID",
    )

    @property
    def is_multi_stage(self) -> bool:
        """是否为多阶段模式"""
        return self.stages is not None and len(self.stages) > 0

    @model_validator(mode="after")
    def validate_stages_continuity(self) -> "LifecyclePolicy":
        """验证多阶段配置的连续性"""
        if not self.stages or len(self.stages) == 0:
            return self

        # 按 start_day 排序
        sorted_stages = sorted(self.stages, key=lambda s: s.start_day)

        # 验证第一阶段从第 1 天开始
        if sorted_stages[0].start_day != 1:
            raise ValueError("第一个阶段必须从第 1 天开始")

        # 验证阶段连续性（无重叠、无间隙）
        for i in range(1, len(sorted_stages)):
            prev_end = sorted_stages[i - 1].end_day
            curr_start = sorted_stages[i].start_day
            if curr_start != prev_end + 1:
                raise ValueError(
                    f"阶段不连续：阶段 {i} 结束于第 {prev_end} 天，"
                    f"阶段 {i + 1} 开始于第 {curr_start} 天"
                )

        # 更新 stages 为排序后的列表
        self.stages = sorted_stages
        return self

    def get_total_days(self) -> Optional[int]:
        """获取多阶段模式的总天数"""
        if not self.stages:
            return None
        return self.stages[-1].end_day


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
        description="回看比例，0.0-1.0（简单模式或默认值）",
    )
    access_pattern_config: Optional[AccessPatternConfig] = Field(
        default=None,
        description="高级访问模式配置，支持时间衰减",
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

    def get_access_rate_for_period(self, start_day: int, end_day: int) -> float:
        """获取指定时间段的访问比例

        如果配置了时间衰减模式，则根据阶段配置计算加权平均访问比例。
        否则返回全局 access_pattern。

        Args:
            start_day: 开始天数（从第 1 天起）
            end_day: 结束天数

        Returns:
            该时间段的加权平均访问比例
        """
        config = self.access_pattern_config

        # 简单模式或无配置：返回全局 access_pattern
        if not config or config.mode == "simple" or not config.stages:
            return self.access_pattern

        # 时间衰减模式：计算加权平均
        total_days = 0
        weighted_sum = 0.0

        for stage in config.stages:
            # 计算与查询范围的重叠
            overlap_start = max(stage.start_day, start_day)
            overlap_end = min(stage.end_day, end_day)

            if overlap_start <= overlap_end:
                overlap_days = overlap_end - overlap_start + 1
                weighted_sum += stage.access_rate * overlap_days
                total_days += overlap_days

        return weighted_sum / total_days if total_days > 0 else self.access_pattern


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
