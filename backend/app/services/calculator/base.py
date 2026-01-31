"""基础计算器 - 通用计算逻辑

提供 IPC 云存储成本评估的基础计算方法，包括：
- 每日数据量计算
- 平均存储量计算
- 月度请求数计算
- 月度检索数据量计算
- 中间指标计算（复用于各计算器子类）
- 定价服务访问（复用于各计算器子类）

静态计算方法可直接调用，不需要实例化。
实例方法需要继承使用。
"""
from typing import TYPE_CHECKING, Optional

from app.models.dimensions import FunctionalDimensions
from app.models.enums import RecordingMode, SegmentStrategy, StorageClass
from app.models.pricing import S3Pricing
from app.models.results import IntermediateMetrics, CostBreakdown, CostSummary

if TYPE_CHECKING:
    from app.services.pricing_service import PricingService


class BaseCalculator:
    """基础计算器类

    提供通用的数据量和请求数计算方法。
    这些方法是所有存储类型计算器的基础。

    静态方法遵循函数式编程风格，输入参数决定输出，无副作用。
    实例方法提供定价服务访问和中间指标计算的复用逻辑。

    子类应继承此类以获得：
    - 定价服务访问 (_get_pricing)
    - 中间指标计算 (_calculate_metrics)
    """

    def __init__(self, pricing_service: Optional["PricingService"] = None):
        """初始化计算器

        Args:
            pricing_service: 定价服务实例，None 时使用全局单例
        """
        self._pricing_service = pricing_service

    def _get_pricing(self, region: str) -> S3Pricing:
        """获取定价数据

        优先使用注入的 PricingService，否则使用全局单例。
        此方法由所有计算器子类复用，避免重复实现。

        Args:
            region: AWS 区域代码

        Returns:
            S3Pricing: 定价信息
        """
        if self._pricing_service is None:
            from app.services.pricing_service import get_pricing_service
            self._pricing_service = get_pricing_service()

        pricing, _ = self._pricing_service.get_pricing(region)
        return pricing

    def _calculate_metrics(self, functional: FunctionalDimensions) -> IntermediateMetrics:
        """计算中间指标

        此方法由所有计算器子类复用，避免重复实现。

        Args:
            functional: 功能维度配置

        Returns:
            中间计算指标
        """
        daily_data_gb = BaseCalculator.calculate_daily_data_gb(functional)
        avg_storage_gb = BaseCalculator.calculate_avg_storage_gb(
            daily_data_gb, functional.retention_days
        )
        monthly_puts = BaseCalculator.calculate_monthly_puts(functional, daily_data_gb)
        monthly_gets = BaseCalculator.calculate_monthly_gets(functional, monthly_puts)
        monthly_retrieval_gb = BaseCalculator.calculate_monthly_retrieval_gb(
            daily_data_gb, functional.access_pattern
        )
        monthly_transfer_gb = BaseCalculator.calculate_monthly_transfer_gb(
            monthly_retrieval_gb
        )

        return IntermediateMetrics(
            daily_data_gb=daily_data_gb,
            avg_storage_gb=avg_storage_gb,
            monthly_puts=monthly_puts,
            monthly_gets=monthly_gets,
            monthly_retrieval_gb=monthly_retrieval_gb,
            monthly_transfer_gb=monthly_transfer_gb,
        )

    @staticmethod
    def calculate_daily_data_gb(functional: FunctionalDimensions) -> float:
        """计算每日数据量 (GB)

        根据录像模式计算每日产生的数据量。

        计算公式：
        - 全天候: 设备数 x 数据率(KB/s) x 86400秒 / 1024 / 1024
        - 事件触发: 设备数 x 数据率(KB/s) x 事件数 x 事件时长 / 1024 / 1024
        - 定时段: 设备数 x 数据率(KB/s) x 小时数 x 3600 / 1024 / 1024

        Args:
            functional: 功能维度配置，包含设备数、录像模式、视频质量等

        Returns:
            每日数据量，单位 GB
        """
        # 计算单设备每日录像秒数
        daily_seconds = BaseCalculator.calculate_daily_recording_seconds(functional)

        # 计算每日数据量 (KB)
        daily_data_kb = functional.device_count * functional.data_rate_kb * daily_seconds

        # 转换为 GB: KB / 1024 / 1024
        return daily_data_kb / 1024 / 1024

    @staticmethod
    def calculate_avg_storage_gb(daily_data_gb: float, retention_days: int) -> float:
        """计算平均存储量 (GB)

        存储量 = 每日数据量 x 保留天数

        这是一个简化模型，假设数据均匀分布。
        实际场景中，数据可能在保留期内逐渐累积，
        但在稳定状态下，平均存储量接近此计算值。

        Args:
            daily_data_gb: 每日数据量 (GB)
            retention_days: 数据保留天数

        Returns:
            平均存储量 (GB)
        """
        return daily_data_gb * retention_days

    @staticmethod
    def calculate_daily_recording_seconds(functional: FunctionalDimensions) -> float:
        """计算每日录像总秒数 (单设备)

        根据录像模式计算单个设备每日的录像时长。

        Args:
            functional: 功能维度配置

        Returns:
            每日录像秒数
        """
        SECONDS_PER_DAY = 86400  # 全天候: 24小时
        SECONDS_PER_HOUR = 3600

        if functional.recording_mode == RecordingMode.CONTINUOUS:
            return SECONDS_PER_DAY
        elif functional.recording_mode == RecordingMode.EVENT_TRIGGERED:
            events = functional.events_per_day or 0
            duration = functional.event_duration_sec or 0
            return events * duration
        elif functional.recording_mode == RecordingMode.SCHEDULED:
            hours = functional.scheduled_hours or 0
            return hours * SECONDS_PER_HOUR

        return 0

    @staticmethod
    def calculate_segments_per_day(
        functional: FunctionalDimensions,
        daily_data_gb: float,
    ) -> float:
        """计算每日分片数 (单设备)

        根据分片策略计算单个设备每日产生的分片数量。
        分片数量直接影响 PUT 请求数和相关成本。

        计算公式：
        - 固定时长: 每日录像秒数 / 分片秒数
        - 固定大小: 每设备数据量(KB) / 分片大小(KB)
        - 实时流: 每日录像秒数 (每秒一个请求)

        Args:
            functional: 功能维度配置
            daily_data_gb: 每日数据量 (GB)，用于固定大小分片策略

        Returns:
            每日分片数 (单设备)
        """
        daily_seconds = BaseCalculator.calculate_daily_recording_seconds(functional)
        segment_value = functional.segment_value

        # 根据分片策略计算分片数
        if functional.segment_strategy == SegmentStrategy.FIXED_DURATION:
            return daily_seconds / segment_value if segment_value > 0 else 0

        elif functional.segment_strategy == SegmentStrategy.FIXED_SIZE:
            if segment_value > 0 and functional.device_count > 0:
                # 每设备每日数据量 (KB)
                KB_PER_GB = 1024 * 1024
                daily_data_kb_per_device = (daily_data_gb / functional.device_count) * KB_PER_GB
                return daily_data_kb_per_device / segment_value
            return 0

        elif functional.segment_strategy == SegmentStrategy.REALTIME_STREAM:
            return daily_seconds

        return 0

    @staticmethod
    def calculate_monthly_puts(
        functional: FunctionalDimensions,
        daily_data_gb: float,
    ) -> float:
        """计算月度 PUT 请求数

        PUT 请求数 = 设备数 x 每日分片数 x 30天

        每次上传一个分片就是一次 PUT 请求。
        这是 S3 成本计算的重要组成部分。

        Args:
            functional: 功能维度配置
            daily_data_gb: 每日数据量 (GB)

        Returns:
            月度 PUT 请求总数
        """
        segments_per_day = BaseCalculator.calculate_segments_per_day(functional, daily_data_gb)
        return functional.device_count * segments_per_day * 30

    @staticmethod
    def calculate_monthly_gets(
        functional: FunctionalDimensions,
        monthly_puts: float,
    ) -> float:
        """计算月度 GET 请求数

        GET 请求数 = 月度 PUT 数 x 访问比例

        访问比例表示用户回看视频的频率。
        假设回看请求与上传请求成比例。

        Args:
            functional: 功能维度配置，包含访问比例
            monthly_puts: 月度 PUT 请求数

        Returns:
            月度 GET 请求总数
        """
        return monthly_puts * functional.access_pattern

    @staticmethod
    def calculate_monthly_retrieval_gb(
        daily_data_gb: float,
        access_pattern: float,
    ) -> float:
        """计算月度检索数据量 (GB)

        检索数据量 = 每日数据量 x 30天 x 访问比例

        这是从存储中读取的数据量，
        对于 Glacier 类存储会产生额外的检索费用。

        Args:
            daily_data_gb: 每日数据量 (GB)
            access_pattern: 访问比例 (0.0-1.0)

        Returns:
            月度检索数据量 (GB)
        """
        return daily_data_gb * 30 * access_pattern

    @staticmethod
    def calculate_monthly_transfer_gb(monthly_retrieval_gb: float) -> float:
        """计算月度数据传输量 (GB)

        数据传输量 = 检索数据量

        假设所有检索的数据都会传输出 AWS。
        数据传输出站会产生额外费用。

        Args:
            monthly_retrieval_gb: 月度检索数据量 (GB)

        Returns:
            月度数据传输量 (GB)
        """
        return monthly_retrieval_gb

    @staticmethod
    def calculate_monthly_gets_for_period(
        functional: FunctionalDimensions,
        monthly_puts: float,
        start_day: int,
        end_day: int,
        total_days: int,
    ) -> float:
        """计算指定时间段的月度 GET 请求数

        支持时间衰减访问模式。根据指定时间段获取对应的访问比例，
        并计算该时间段的 GET 请求数。

        Args:
            functional: 功能维度配置
            monthly_puts: 月度 PUT 请求总数
            start_day: 阶段开始天数
            end_day: 阶段结束天数
            total_days: 总保留天数

        Returns:
            该时间段的月度 GET 请求数
        """
        # 获取该时间段的访问比例
        access_rate = functional.get_access_rate_for_period(start_day, end_day)

        # 计算该阶段的 PUT 请求比例
        period_days = end_day - start_day + 1
        period_puts = monthly_puts * (period_days / total_days) if total_days > 0 else 0

        return period_puts * access_rate

    @staticmethod
    def calculate_monthly_retrieval_for_period(
        daily_data_gb: float,
        functional: FunctionalDimensions,
        start_day: int,
        end_day: int,
    ) -> float:
        """计算指定时间段的月度检索数据量

        支持时间衰减访问模式。根据指定时间段获取对应的访问比例，
        并计算该时间段的检索数据量。

        Args:
            daily_data_gb: 每日数据量 (GB)
            functional: 功能维度配置
            start_day: 阶段开始天数
            end_day: 阶段结束天数

        Returns:
            该时间段的月度检索量 (GB)
        """
        period_days = end_day - start_day + 1
        access_rate = functional.get_access_rate_for_period(start_day, end_day)

        return daily_data_gb * period_days * access_rate

    def _calculate_storage_costs(
        self,
        metrics: IntermediateMetrics,
        pricing: S3Pricing,
        storage_class: StorageClass,
        discount: float,
    ) -> CostBreakdown:
        """计算各项存储费用（通用方法）

        提供标准的费用计算逻辑，减少子类重复代码。
        支持 S3 Standard 和 Glacier IR 的费用计算。

        Args:
            metrics: 中间指标
            pricing: 定价信息
            storage_class: 存储类型
            discount: 折扣比例 (0-1)

        Returns:
            费用明细
        """
        discount_multiplier = 1 - discount

        # 拆分为独立的计算方法，提高可读性和可测试性
        storage_cost = self._calculate_storage_fee(
            metrics.avg_storage_gb, pricing, storage_class, discount_multiplier
        )
        put_cost = self._calculate_request_fee(
            metrics.monthly_puts, pricing.get_put_price(storage_class), discount_multiplier
        )
        get_cost = self._calculate_request_fee(
            metrics.monthly_gets, pricing.get_get_price(storage_class), discount_multiplier
        )
        transfer_cost = self._calculate_transfer_fee(
            metrics.monthly_transfer_gb, pricing, discount_multiplier
        )
        retrieval_cost = self._calculate_retrieval_fee(
            metrics.monthly_retrieval_gb, pricing, storage_class, discount_multiplier
        )

        return CostBreakdown(
            storage_cost=storage_cost,
            put_request_cost=put_cost,
            get_request_cost=get_cost,
            retrieval_cost=retrieval_cost,
            data_transfer_cost=transfer_cost,
            lifecycle_cost=0.0,  # 直接使用单一存储类型时没有生命周期费用
        )

    def _calculate_storage_fee(
        self, storage_gb: float, pricing: S3Pricing,
        storage_class: StorageClass, multiplier: float
    ) -> float:
        """计算存储费用"""
        return storage_gb * pricing.get_storage_price(storage_class) * multiplier

    def _calculate_request_fee(
        self, request_count: float, unit_price: float, multiplier: float
    ) -> float:
        """计算请求费用（PUT或GET）"""
        return (request_count / 1000) * unit_price * multiplier

    def _calculate_transfer_fee(
        self, transfer_gb: float, pricing: S3Pricing, multiplier: float
    ) -> float:
        """计算数据传输费用"""
        return transfer_gb * pricing.get_data_transfer_price(transfer_gb) * multiplier

    def _calculate_retrieval_fee(
        self, retrieval_gb: float, pricing: S3Pricing,
        storage_class: StorageClass, multiplier: float
    ) -> float:
        """计算检索费用（仅适用于某些存储类型）"""
        retrieval_price = pricing.get_retrieval_price(storage_class)
        if retrieval_price > 0:
            return retrieval_gb * retrieval_price * multiplier
        return 0.0

    def _create_cost_summary(
        self, breakdown: CostBreakdown, device_count: int,
        metrics: IntermediateMetrics
    ) -> CostSummary:
        """创建成本汇总结果（减少重复代码）

        Args:
            breakdown: 费用明细
            device_count: 设备数量
            metrics: 中间指标

        Returns:
            成本汇总
        """
        return CostSummary(
            monthly_total=breakdown.total,
            per_device_monthly=breakdown.total / device_count,
            breakdown=breakdown,
            device_count=device_count,
            metrics=metrics,
        )
