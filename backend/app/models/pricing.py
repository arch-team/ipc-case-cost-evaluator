"""AWS S3 定价模型

定义 AWS S3 各存储类型的定价模型和定价数据加载器。
支持按区域加载定价数据，包含存储费用、请求费用、检索费用和数据传输费用。
"""
import json
import logging
from pathlib import Path
from typing import Dict, List

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

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

        # 定义阶梯边界和对应价格
        tiers = [
            (10 * 1024, self.out_first_10tb_per_gb),     # 10 TB
            (50 * 1024, self.out_next_40tb_per_gb),      # 50 TB
            (150 * 1024, self.out_next_100tb_per_gb),    # 150 TB
            (float('inf'), self.out_over_150tb_per_gb),  # 超过 150 TB
        ]

        for threshold, price in tiers:
            if total_gb <= threshold:
                return price

        return self.out_over_150tb_per_gb  # 理论上不会到达这里


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
        # 返回缓存的数据
        if region in cls._cache:
            return cls._cache[region]

        # 加载并缓存新数据
        pricing = cls._load_from_file(region)
        cls._cache[region] = pricing
        return pricing

    # 数据传输定价的合理范围 (USD/GB)
    DATA_TRANSFER_MIN = 0.05  # 最低合理价格 (美国区域最高层级)
    DATA_TRANSFER_MAX = 0.20  # 最高合理价格 (南美等高价区域)

    @classmethod
    def _load_from_file(cls, region: str) -> S3Pricing:
        """从文件加载定价数据

        Args:
            region: AWS 区域代码

        Returns:
            S3Pricing: 定价信息

        Raises:
            ValueError: 当区域不存在时
        """
        pricing_file = cls._pricing_dir / f"{region}.json"
        if not pricing_file.exists():
            available = cls.available_regions()
            raise ValueError(
                f"不支持的区域: {region}。可用区域: {', '.join(available)}"
            )

        with open(pricing_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        # 转换数据格式
        data["storage_classes"] = cls._parse_storage_classes(data["storage_classes"])
        data["data_transfer"] = DataTransferPricing(**data["data_transfer"])

        # 验证数据传输定价合理性
        cls._validate_data_transfer_pricing(region, data["data_transfer"], data.get("last_updated", "unknown"))

        return S3Pricing(**data)

    @classmethod
    def _validate_data_transfer_pricing(
        cls, region: str, pricing: DataTransferPricing, last_updated: str
    ) -> None:
        """验证数据传输定价的合理性

        检查定价是否在预期范围内，如果不在则记录警告。

        Args:
            region: 区域代码
            pricing: 数据传输定价
            last_updated: 定价更新日期
        """
        first_10tb_price = pricing.out_first_10tb_per_gb

        if first_10tb_price < cls.DATA_TRANSFER_MIN:
            logger.warning(
                f"[{region}] 数据传输定价 ${first_10tb_price}/GB 低于预期最低值 "
                f"${cls.DATA_TRANSFER_MIN}/GB (更新日期: {last_updated})"
            )
        elif first_10tb_price > cls.DATA_TRANSFER_MAX:
            logger.warning(
                f"[{region}] 数据传输定价 ${first_10tb_price}/GB 高于预期最高值 "
                f"${cls.DATA_TRANSFER_MAX}/GB (更新日期: {last_updated})"
            )
        else:
            logger.debug(
                f"[{region}] 数据传输定价: 前10TB=${first_10tb_price}/GB "
                f"(来源: 本地文件, 更新日期: {last_updated})"
            )

    @classmethod
    def _parse_storage_classes(cls, storage_data: Dict) -> Dict[StorageClass, StorageClassPricing]:
        """解析存储类型定价数据

        Args:
            storage_data: 原始存储类型数据

        Returns:
            转换后的存储类型定价字典
        """
        return {
            StorageClass(key): StorageClassPricing(**value)
            for key, value in storage_data.items()
        }

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

    @classmethod
    def save(cls, pricing: "S3Pricing") -> None:
        """保存定价数据到本地 JSON 文件

        将 S3Pricing 对象序列化并保存到对应区域的 JSON 文件中。
        用于在从 AWS API 获取最新数据后更新本地缓存文件。

        Args:
            pricing: S3Pricing 定价数据对象
        """
        pricing_file = cls._pricing_dir / f"{pricing.region}.json"

        # 确保目录存在
        cls._pricing_dir.mkdir(parents=True, exist_ok=True)

        # 转换为可序列化的字典格式
        data = {
            "region": pricing.region,
            "region_name": pricing.region_name,
            "currency": pricing.currency,
            "last_updated": pricing.last_updated,
            "storage_classes": {
                storage_class.value: {
                    "storage_per_gb_month": class_pricing.storage_per_gb_month,
                    "put_per_1000": class_pricing.put_per_1000,
                    "get_per_1000": class_pricing.get_per_1000,
                    "retrieval_per_gb": class_pricing.retrieval_per_gb,
                    "lifecycle_transition_per_1000": class_pricing.lifecycle_transition_per_1000,
                }
                for storage_class, class_pricing in pricing.storage_classes.items()
            },
            "data_transfer": {
                "out_first_10tb_per_gb": pricing.data_transfer.out_first_10tb_per_gb,
                "out_next_40tb_per_gb": pricing.data_transfer.out_next_40tb_per_gb,
                "out_next_100tb_per_gb": pricing.data_transfer.out_next_100tb_per_gb,
                "out_over_150tb_per_gb": pricing.data_transfer.out_over_150tb_per_gb,
            },
        }

        with open(pricing_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        # 更新内存缓存
        cls._cache[pricing.region] = pricing
