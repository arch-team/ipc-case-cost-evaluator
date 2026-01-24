"""基础计算器 - 通用计算逻辑

提供 IPC 云存储成本评估的基础计算方法，包括：
- 每日数据量计算
- 平均存储量计算
- 月度请求数计算
- 月度检索数据量计算

所有方法为静态方法，可直接调用，不需要实例化。
"""
from app.models.dimensions import FunctionalDimensions
from app.models.enums import RecordingMode, SegmentStrategy


class BaseCalculator:
    """基础计算器类

    提供通用的数据量和请求数计算方法。
    这些方法是所有存储类型计算器的基础。

    所有方法均为静态方法，遵循函数式编程风格，
    输入参数决定输出，无副作用。
    """

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
        data_rate_kb = functional.data_rate_kb
        device_count = functional.device_count

        if functional.recording_mode == RecordingMode.CONTINUOUS:
            # 全天候: 24小时不间断录像
            daily_data_kb = device_count * data_rate_kb * 86400
        elif functional.recording_mode == RecordingMode.EVENT_TRIGGERED:
            # 事件触发: 仅在检测到事件时录像
            events = functional.events_per_day or 0
            duration = functional.event_duration_sec or 0
            daily_data_kb = device_count * data_rate_kb * events * duration
        elif functional.recording_mode == RecordingMode.SCHEDULED:
            # 定时段: 按预设时间段录像
            hours = functional.scheduled_hours or 0
            daily_data_kb = device_count * data_rate_kb * hours * 3600
        else:
            daily_data_kb = 0

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
        if functional.recording_mode == RecordingMode.CONTINUOUS:
            # 全天候: 24小时 = 86400秒
            return 86400
        elif functional.recording_mode == RecordingMode.EVENT_TRIGGERED:
            # 事件触发: 事件数 x 事件时长
            events = functional.events_per_day or 0
            duration = functional.event_duration_sec or 0
            return events * duration
        elif functional.recording_mode == RecordingMode.SCHEDULED:
            # 定时段: 小时数 x 3600秒
            hours = functional.scheduled_hours or 0
            return hours * 3600
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

        if functional.segment_strategy == SegmentStrategy.FIXED_DURATION:
            # 固定时长分片: 按时间分割
            segment_seconds = functional.segment_value
            if segment_seconds > 0:
                return daily_seconds / segment_seconds
            return 0
        elif functional.segment_strategy == SegmentStrategy.FIXED_SIZE:
            # 固定大小分片: 按文件大小分割
            segment_size_kb = functional.segment_value
            if segment_size_kb > 0 and functional.device_count > 0:
                # 每设备每日数据量 (KB)
                daily_data_kb_per_device = (daily_data_gb / functional.device_count) * 1024 * 1024
                return daily_data_kb_per_device / segment_size_kb
            return 0
        elif functional.segment_strategy == SegmentStrategy.REALTIME_STREAM:
            # 实时流: 每秒一个请求
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
