"""AWS S3 定价模型

定义 AWS S3 各存储类型的定价模型和定价数据加载器。
支持按区域加载定价数据，包含存储费用、请求费用、检索费用和数据传输费用。
"""
import json
from pathlib import Path
from typing import Dict, List

from pydantic import BaseModel, Field

from app.models.enums import StorageClass


class StorageClassPricing(BaseModel):
    """存储类型定价

    定义单个 S3 存储类型的所有定价项。

    Attributes:
        storage_per_gb_month: 每 GB-月存储费用 (USD)
        put_per_1000: 每千次 PUT 请求费用 (USD)
        get_per_1000: 每千次 GET 请求费用 (USD)
        retrieval_per_gb: 每 GB 检索费用 (USD)，Standard 为 0
        lifecycle_transition_per_1000: 每千次生命周期转换费用 (USD)
    """

    storage_per_gb_month: float = Field(..., description="每 GB-月存储费用")
    put_per_1000: float = Field(..., description="每千次 PUT 请求费用")
    get_per_1000: float = Field(..., description="每千次 GET 请求费用")
    retrieval_per_gb: float = Field(default=0, description="每 GB 检索费用")
    lifecycle_transition_per_1000: float = Field(
        default=0, description="每千次生命周期转换费用"
    )


class DataTransferPricing(BaseModel):
    """数据传输定价 (阶梯定价)

    AWS S3 数据传输出站采用阶梯定价模式，
    数据量越大，单位价格越低。

    Attributes:
        out_first_10tb_per_gb: 前 10TB 每 GB 价格
        out_next_40tb_per_gb: 10-50TB 每 GB 价格
        out_next_100tb_per_gb: 50-150TB 每 GB 价格
        out_over_150tb_per_gb: 150TB 以上每 GB 价格
    """

    out_first_10tb_per_gb: float
    out_next_40tb_per_gb: float
    out_next_100tb_per_gb: float
    out_over_150tb_per_gb: float

    def get_price_for_gb(self, total_gb: float) -> float:
        """获取指定数据量对应的单位价格

        根据累计数据传输量返回对应的阶梯价格。
        注意：返回的是单位价格，非总价。

        Args:
            total_gb: 累计数据传输量 (GB)

        Returns:
            对应阶梯的单位价格 (USD/GB)
        """
        if total_gb <= 0:
            return 0
        if total_gb <= 10 * 1024:  # 10 TB
            return self.out_first_10tb_per_gb
        elif total_gb <= 50 * 1024:  # 50 TB
            return self.out_next_40tb_per_gb
        elif total_gb <= 150 * 1024:  # 150 TB
            return self.out_next_100tb_per_gb
        else:
            return self.out_over_150tb_per_gb


class S3Pricing(BaseModel):
    """S3 区域定价

    某个 AWS 区域的完整 S3 定价信息，
    包含所有存储类型的定价和数据传输定价。

    Attributes:
        region: AWS 区域代码，如 "ap-northeast-1"
        region_name: 区域显示名称，如 "Asia Pacific (Tokyo)"
        currency: 货币单位，默认 "USD"
        last_updated: 定价更新日期
        storage_classes: 各存储类型的定价
        data_transfer: 数据传输定价
    """

    region: str
    region_name: str
    currency: str = "USD"
    last_updated: str
    storage_classes: Dict[StorageClass, StorageClassPricing]
    data_transfer: DataTransferPricing

    def get_storage_price(self, storage_class: StorageClass) -> float:
        """获取存储价格

        Args:
            storage_class: S3 存储类型

        Returns:
            每 GB-月存储费用
        """
        return self.storage_classes[storage_class].storage_per_gb_month

    def get_put_price(self, storage_class: StorageClass) -> float:
        """获取 PUT 请求价格

        Args:
            storage_class: S3 存储类型

        Returns:
            每千次 PUT 请求费用
        """
        return self.storage_classes[storage_class].put_per_1000

    def get_get_price(self, storage_class: StorageClass) -> float:
        """获取 GET 请求价格

        Args:
            storage_class: S3 存储类型

        Returns:
            每千次 GET 请求费用
        """
        return self.storage_classes[storage_class].get_per_1000

    def get_retrieval_price(self, storage_class: StorageClass) -> float:
        """获取检索价格

        Standard 存储类型没有检索费用，返回 0。
        Glacier 系列存储类型有检索费用。

        Args:
            storage_class: S3 存储类型

        Returns:
            每 GB 检索费用
        """
        return self.storage_classes[storage_class].retrieval_per_gb

    def get_lifecycle_price(self, target_class: StorageClass) -> float:
        """获取生命周期转换价格

        转换到目标存储类型的费用。
        转换到 Standard 没有费用，转换到 Glacier 系列有费用。

        Args:
            target_class: 目标存储类型

        Returns:
            每千次生命周期转换费用
        """
        return self.storage_classes[target_class].lifecycle_transition_per_1000

    def get_data_transfer_price(self, total_gb: float) -> float:
        """获取数据传输出站价格

        根据累计数据传输量返回对应的阶梯价格。

        Args:
            total_gb: 累计数据传输量 (GB)

        Returns:
            对应阶梯的单位价格 (USD/GB)
        """
        return self.data_transfer.get_price_for_gb(total_gb)


class PricingLoader:
    """定价数据加载器

    从 JSON 文件加载区域定价数据，支持缓存机制。
    定价数据文件存放在 app/data/aws_pricing/ 目录下，
    文件名为 {region}.json。
    """

    _cache: Dict[str, S3Pricing] = {}
    _pricing_dir: Path = Path(__file__).parent.parent / "data" / "aws_pricing"

    @classmethod
    def load(cls, region: str) -> S3Pricing:
        """加载指定区域的定价数据

        首次加载时从 JSON 文件读取并缓存，
        后续请求直接返回缓存的数据。

        Args:
            region: AWS 区域代码，如 "ap-northeast-1"

        Returns:
            S3Pricing: 该区域的完整定价信息

        Raises:
            ValueError: 当指定的区域不存在定价数据时
        """
        if region in cls._cache:
            return cls._cache[region]

        pricing_file = cls._pricing_dir / f"{region}.json"
        if not pricing_file.exists():
            available = cls.available_regions()
            raise ValueError(
                f"不支持的区域: {region}。可用区域: {', '.join(available)}"
            )

        with open(pricing_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        # 将存储类型键转换为枚举
        storage_classes = {}
        for key, value in data["storage_classes"].items():
            storage_class = StorageClass(key)
            storage_classes[storage_class] = StorageClassPricing(**value)

        data["storage_classes"] = storage_classes
        data["data_transfer"] = DataTransferPricing(**data["data_transfer"])

        pricing = S3Pricing(**data)
        cls._cache[region] = pricing
        return pricing

    @classmethod
    def available_regions(cls) -> List[str]:
        """获取所有可用的区域列表

        扫描定价数据目录，返回所有已定义定价的区域。

        Returns:
            区域代码列表
        """
        if not cls._pricing_dir.exists():
            return []
        return [f.stem for f in cls._pricing_dir.glob("*.json")]

    @classmethod
    def clear_cache(cls) -> None:
        """清除定价缓存

        用于测试或需要重新加载定价数据的场景。
        """
        cls._cache.clear()
