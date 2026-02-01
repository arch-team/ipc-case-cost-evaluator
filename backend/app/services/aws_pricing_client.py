"""AWS Pricing API 客户端

提供从 AWS Pricing API 动态获取 S3 定价数据的功能。
支持异步操作，包含错误处理和重试机制。
"""
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.models.enums import StorageClass
from app.models.pricing import (
    DataTransferPricing,
    S3Pricing,
    StorageClassPricing,
)
from app.models.regions import REGION_NAMES_EN

logger = logging.getLogger(__name__)


# AWS 存储类型到 Pricing API 存储类型的映射
STORAGE_CLASS_MAPPING = {
    StorageClass.STANDARD: "General Purpose",
    StorageClass.INTELLIGENT_TIERING: "Intelligent-Tiering",
    StorageClass.STANDARD_IA: "Standard - Infrequent Access",
    StorageClass.ONEZONE_IA: "One Zone - Infrequent Access",
    StorageClass.GLACIER_IR: "Glacier Instant Retrieval",
    StorageClass.GLACIER_FR: "Glacier Flexible Retrieval",
    StorageClass.DEEP_ARCHIVE: "Glacier Deep Archive",
}

# AWS 区域代码到显示名称的映射 - 使用统一数据源
REGION_NAMES = REGION_NAMES_EN


class AWSPricingAPIError(Exception):
    """AWS Pricing API 错误"""

    pass


class AWSPricingClient:
    """AWS Pricing API 客户端

    从 AWS Pricing API 获取 S3 定价数据。
    Pricing API 只在 us-east-1 和 ap-south-1 可用。

    Attributes:
        client: boto3 Pricing 客户端
    """

    def __init__(self, region: str = "us-east-1"):
        """初始化 AWS Pricing API 客户端

        Args:
            region: Pricing API 区域，只能是 us-east-1 或 ap-south-1
        """
        if region not in ("us-east-1", "ap-south-1"):
            logger.warning(
                f"Pricing API 只在 us-east-1 和 ap-south-1 可用，"
                f"将使用 us-east-1 替代 {region}"
            )
            region = "us-east-1"

        try:
            self.client = boto3.client("pricing", region_name=region)
        except Exception as e:
            logger.error(f"创建 Pricing API 客户端失败: {e}")
            raise AWSPricingAPIError(f"无法创建 Pricing API 客户端: {e}")

    def get_s3_pricing(self, target_region: str) -> S3Pricing:
        """获取指定区域的 S3 定价

        Args:
            target_region: 目标 AWS 区域代码，如 "ap-northeast-1"

        Returns:
            S3Pricing: 该区域的完整 S3 定价信息

        Raises:
            AWSPricingAPIError: 当 API 调用失败时
        """
        try:
            storage_classes = self._fetch_storage_pricing(target_region)
            data_transfer = self._fetch_data_transfer_pricing(target_region)

            return S3Pricing(
                region=target_region,
                region_name=REGION_NAMES.get(target_region, target_region),
                currency="USD",
                last_updated=datetime.now().strftime("%Y-%m-%d"),
                storage_classes=storage_classes,
                data_transfer=data_transfer,
            )
        except (BotoCoreError, ClientError) as e:
            logger.error(f"AWS API 调用失败: {e}")
            raise AWSPricingAPIError(f"获取 {target_region} 定价失败: {e}")
        except Exception as e:
            logger.error(f"解析定价数据失败: {e}")
            raise AWSPricingAPIError(f"解析定价数据失败: {e}")

    def _fetch_storage_pricing(
        self, target_region: str
    ) -> Dict[StorageClass, StorageClassPricing]:
        """获取存储类型定价

        Args:
            target_region: 目标区域

        Returns:
            各存储类型的定价字典
        """
        result = {}

        for storage_class, api_storage_class in STORAGE_CLASS_MAPPING.items():
            pricing = self._fetch_single_storage_pricing(
                target_region, storage_class, api_storage_class
            )
            if pricing:
                result[storage_class] = pricing

        # 确保至少有 STANDARD 定价
        if StorageClass.STANDARD not in result:
            raise AWSPricingAPIError(
                f"无法获取 {target_region} 的 S3 Standard 定价"
            )

        # 如果缺少某些存储类型，使用默认值
        self._fill_missing_storage_classes(result)

        return result

    def _fetch_single_storage_pricing(
        self,
        target_region: str,
        storage_class: StorageClass,
        api_storage_class: str,
    ) -> Optional[StorageClassPricing]:
        """获取单个存储类型的定价

        Args:
            target_region: 目标区域
            storage_class: 内部存储类型枚举
            api_storage_class: AWS API 存储类型名称

        Returns:
            StorageClassPricing 或 None（如果获取失败）
        """
        try:
            # 查询存储费用
            storage_price = self._query_price(
                target_region,
                filters=[
                    {"Type": "TERM_MATCH", "Field": "productFamily", "Value": "Storage"},
                    {"Type": "TERM_MATCH", "Field": "storageClass", "Value": api_storage_class},
                ],
            )

            # 查询请求费用
            put_price = self._query_request_price(target_region, api_storage_class, "PUT")
            get_price = self._query_request_price(target_region, api_storage_class, "GET")

            # IA 和 Glacier 类型的检索费用和生命周期转换费用
            # 这些存储类型都有检索费用（STANDARD 和 INTELLIGENT_TIERING 没有）
            retrieval_price = 0.0
            lifecycle_price = 0.0

            storage_classes_with_retrieval = (
                StorageClass.STANDARD_IA,
                StorageClass.ONEZONE_IA,
                StorageClass.GLACIER_IR,
                StorageClass.GLACIER_FR,
                StorageClass.DEEP_ARCHIVE,
            )

            if storage_class in storage_classes_with_retrieval:
                retrieval_price = self._query_retrieval_price(
                    target_region, api_storage_class
                )
                lifecycle_price = self._query_lifecycle_price(
                    target_region, api_storage_class
                )
                # 如果 API 未返回检索和转换费用，使用默认值
                if retrieval_price == 0.0:
                    retrieval_price = self._get_default_retrieval_price(storage_class)
                if lifecycle_price == 0.0:
                    lifecycle_price = self._get_default_lifecycle_price(storage_class)

            return StorageClassPricing(
                storage_per_gb_month=storage_price or self._get_default_storage_price(storage_class),
                put_per_1000=put_price or self._get_default_put_price(storage_class),
                get_per_1000=get_price or self._get_default_get_price(storage_class),
                retrieval_per_gb=retrieval_price,
                lifecycle_transition_per_1000=lifecycle_price,
            )
        except Exception as e:
            logger.warning(f"获取 {storage_class.value} 定价失败: {e}")
            return None

    def _query_price(
        self,
        target_region: str,
        filters: List[Dict[str, str]],
    ) -> Optional[float]:
        """执行价格查询

        Args:
            target_region: 目标区域
            filters: 查询过滤条件

        Returns:
            价格值或 None
        """
        try:
            # 添加区域过滤
            all_filters = [
                {"Type": "TERM_MATCH", "Field": "regionCode", "Value": target_region},
                {"Type": "TERM_MATCH", "Field": "serviceCode", "Value": "AmazonS3"},
            ] + filters

            response = self.client.get_products(
                ServiceCode="AmazonS3",
                Filters=all_filters,
                MaxResults=10,
            )

            return self._extract_price_from_response(response)
        except Exception as e:
            logger.debug(f"价格查询失败: {e}")
            return None

    def _query_request_price(
        self,
        target_region: str,
        storage_class: str,
        request_type: str,
    ) -> Optional[float]:
        """查询请求费用

        Args:
            target_region: 目标区域
            storage_class: 存储类型
            request_type: 请求类型（PUT 或 GET）

        Returns:
            每千次请求价格或 None
        """
        return self._query_price(
            target_region,
            filters=[
                {"Type": "TERM_MATCH", "Field": "productFamily", "Value": "API Request"},
                {"Type": "TERM_MATCH", "Field": "storageClass", "Value": storage_class},
                {"Type": "TERM_MATCH", "Field": "operation", "Value": request_type},
            ],
        )

    def _query_retrieval_price(
        self,
        target_region: str,
        storage_class: str,
    ) -> float:
        """查询检索费用

        Args:
            target_region: 目标区域
            storage_class: 存储类型

        Returns:
            每 GB 检索价格
        """
        price = self._query_price(
            target_region,
            filters=[
                {"Type": "TERM_MATCH", "Field": "productFamily", "Value": "Data Retrieval"},
                {"Type": "TERM_MATCH", "Field": "storageClass", "Value": storage_class},
            ],
        )
        return price or 0.0

    def _query_lifecycle_price(
        self,
        target_region: str,
        storage_class: str,
    ) -> float:
        """查询生命周期转换费用

        Args:
            target_region: 目标区域
            storage_class: 目标存储类型

        Returns:
            每千次转换价格
        """
        price = self._query_price(
            target_region,
            filters=[
                {"Type": "TERM_MATCH", "Field": "productFamily", "Value": "S3 Lifecycle Transition"},
                {"Type": "TERM_MATCH", "Field": "toLocation", "Value": storage_class},
            ],
        )
        return price or 0.0

    # 各区域数据传输定价的默认回退值
    # 当 API 查询失败时使用，基于 AWS 官方定价 (2024-2025)
    DATA_TRANSFER_DEFAULTS = {
        # 美国/加拿大
        "us-east-1": {"first_10tb": 0.09, "next_40tb": 0.085, "next_100tb": 0.07, "over_150tb": 0.05},
        "us-east-2": {"first_10tb": 0.09, "next_40tb": 0.085, "next_100tb": 0.07, "over_150tb": 0.05},
        "us-west-1": {"first_10tb": 0.09, "next_40tb": 0.085, "next_100tb": 0.07, "over_150tb": 0.05},
        "us-west-2": {"first_10tb": 0.09, "next_40tb": 0.085, "next_100tb": 0.07, "over_150tb": 0.05},
        "ca-central-1": {"first_10tb": 0.09, "next_40tb": 0.085, "next_100tb": 0.07, "over_150tb": 0.05},
        "ca-west-1": {"first_10tb": 0.09, "next_40tb": 0.085, "next_100tb": 0.07, "over_150tb": 0.05},
        # 欧洲
        "eu-west-1": {"first_10tb": 0.09, "next_40tb": 0.085, "next_100tb": 0.07, "over_150tb": 0.05},
        "eu-west-2": {"first_10tb": 0.09, "next_40tb": 0.085, "next_100tb": 0.07, "over_150tb": 0.05},
        "eu-west-3": {"first_10tb": 0.09, "next_40tb": 0.085, "next_100tb": 0.07, "over_150tb": 0.05},
        "eu-central-1": {"first_10tb": 0.09, "next_40tb": 0.085, "next_100tb": 0.07, "over_150tb": 0.05},
        "eu-central-2": {"first_10tb": 0.09, "next_40tb": 0.085, "next_100tb": 0.07, "over_150tb": 0.05},
        "eu-north-1": {"first_10tb": 0.09, "next_40tb": 0.085, "next_100tb": 0.07, "over_150tb": 0.05},
        "eu-south-1": {"first_10tb": 0.09, "next_40tb": 0.085, "next_100tb": 0.07, "over_150tb": 0.05},
        "eu-south-2": {"first_10tb": 0.09, "next_40tb": 0.085, "next_100tb": 0.07, "over_150tb": 0.05},
        # 亚太-低价
        "ap-south-1": {"first_10tb": 0.1093, "next_40tb": 0.085, "next_100tb": 0.082, "over_150tb": 0.08},
        "ap-south-2": {"first_10tb": 0.1093, "next_40tb": 0.085, "next_100tb": 0.082, "over_150tb": 0.08},
        "ap-southeast-1": {"first_10tb": 0.1093, "next_40tb": 0.085, "next_100tb": 0.082, "over_150tb": 0.08},
        "ap-southeast-3": {"first_10tb": 0.1093, "next_40tb": 0.085, "next_100tb": 0.082, "over_150tb": 0.08},
        # 亚太-标准
        "ap-northeast-1": {"first_10tb": 0.114, "next_40tb": 0.089, "next_100tb": 0.086, "over_150tb": 0.084},
        "ap-northeast-2": {"first_10tb": 0.114, "next_40tb": 0.089, "next_100tb": 0.086, "over_150tb": 0.084},
        "ap-northeast-3": {"first_10tb": 0.114, "next_40tb": 0.089, "next_100tb": 0.086, "over_150tb": 0.084},
        "ap-southeast-2": {"first_10tb": 0.114, "next_40tb": 0.089, "next_100tb": 0.086, "over_150tb": 0.084},
        "ap-southeast-4": {"first_10tb": 0.114, "next_40tb": 0.089, "next_100tb": 0.086, "over_150tb": 0.084},
        "ap-southeast-5": {"first_10tb": 0.114, "next_40tb": 0.089, "next_100tb": 0.086, "over_150tb": 0.084},
        "ap-east-1": {"first_10tb": 0.114, "next_40tb": 0.089, "next_100tb": 0.086, "over_150tb": 0.084},
        # 中东/非洲
        "me-south-1": {"first_10tb": 0.117, "next_40tb": 0.107, "next_100tb": 0.1, "over_150tb": 0.09},
        "me-central-1": {"first_10tb": 0.117, "next_40tb": 0.107, "next_100tb": 0.1, "over_150tb": 0.09},
        "af-south-1": {"first_10tb": 0.117, "next_40tb": 0.107, "next_100tb": 0.1, "over_150tb": 0.09},
        "il-central-1": {"first_10tb": 0.117, "next_40tb": 0.107, "next_100tb": 0.1, "over_150tb": 0.09},
        # 南美
        "sa-east-1": {"first_10tb": 0.15, "next_40tb": 0.138, "next_100tb": 0.134, "over_150tb": 0.13},
    }

    # 默认回退值（使用美国区域价格作为保守估算）
    DEFAULT_DATA_TRANSFER = {"first_10tb": 0.09, "next_40tb": 0.085, "next_100tb": 0.07, "over_150tb": 0.05}

    def _fetch_data_transfer_pricing(self, target_region: str) -> DataTransferPricing:
        """获取数据传输定价

        AWS 数据传输采用阶梯定价，各区域价格不同。
        首先尝试从 API 获取，失败时使用区域特定的默认值。

        Args:
            target_region: 目标区域

        Returns:
            DataTransferPricing: 数据传输定价
        """
        # 获取区域特定的默认值
        region_defaults = self.DATA_TRANSFER_DEFAULTS.get(
            target_region, self.DEFAULT_DATA_TRANSFER
        )

        # 尝试查询数据传输价格
        try:
            response = self.client.get_products(
                ServiceCode="AmazonS3",
                Filters=[
                    {"Type": "TERM_MATCH", "Field": "regionCode", "Value": target_region},
                    {"Type": "TERM_MATCH", "Field": "productFamily", "Value": "Data Transfer"},
                    {"Type": "TERM_MATCH", "Field": "transferType", "Value": "AWS Outbound"},
                ],
                MaxResults=20,
            )

            prices = self._extract_tiered_prices(response)
            if prices:
                result = DataTransferPricing(
                    out_first_10tb_per_gb=prices.get("first_10tb", region_defaults["first_10tb"]),
                    out_next_40tb_per_gb=prices.get("next_40tb", region_defaults["next_40tb"]),
                    out_next_100tb_per_gb=prices.get("next_100tb", region_defaults["next_100tb"]),
                    out_over_150tb_per_gb=prices.get("over_150tb", region_defaults["over_150tb"]),
                )
                logger.info(
                    f"从 API 获取 {target_region} 数据传输定价: "
                    f"前10TB=${result.out_first_10tb_per_gb}/GB"
                )
                return result
        except Exception as e:
            logger.warning(f"从 API 获取 {target_region} 数据传输定价失败: {e}")

        # 返回区域特定的默认值
        logger.info(
            f"使用 {target_region} 数据传输默认定价: "
            f"前10TB=${region_defaults['first_10tb']}/GB"
        )
        return DataTransferPricing(
            out_first_10tb_per_gb=region_defaults["first_10tb"],
            out_next_40tb_per_gb=region_defaults["next_40tb"],
            out_next_100tb_per_gb=region_defaults["next_100tb"],
            out_over_150tb_per_gb=region_defaults["over_150tb"],
        )

    def _extract_price_from_response(
        self, response: Dict[str, Any]
    ) -> Optional[float]:
        """从 API 响应中提取价格

        Args:
            response: AWS API 响应

        Returns:
            提取的价格值或 None
        """
        try:
            price_list = response.get("PriceList", [])
            if not price_list:
                return None

            # 解析第一个结果
            price_data = json.loads(price_list[0])
            terms = price_data.get("terms", {}).get("OnDemand", {})

            for term_key, term_value in terms.items():
                price_dimensions = term_value.get("priceDimensions", {})
                for dim_key, dim_value in price_dimensions.items():
                    price_per_unit = dim_value.get("pricePerUnit", {})
                    usd_price = price_per_unit.get("USD")
                    if usd_price:
                        return float(usd_price)

            return None
        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
            logger.debug(f"解析价格失败: {e}")
            return None

    def _extract_tiered_prices(
        self, response: Dict[str, Any]
    ) -> Dict[str, float]:
        """从响应中提取阶梯价格

        Args:
            response: AWS API 响应

        Returns:
            阶梯价格字典
        """
        prices = {}
        try:
            price_list = response.get("PriceList", [])
            for price_json in price_list:
                price_data = json.loads(price_json)
                terms = price_data.get("terms", {}).get("OnDemand", {})

                for term_value in terms.values():
                    for dim_value in term_value.get("priceDimensions", {}).values():
                        begin_range = float(dim_value.get("beginRange", 0))
                        end_range = dim_value.get("endRange", "Inf")
                        usd_price = dim_value.get("pricePerUnit", {}).get("USD")

                        if usd_price:
                            price = float(usd_price)
                            # 根据范围分配到对应阶梯
                            if begin_range == 0:
                                prices["first_10tb"] = price
                            elif begin_range <= 10240:
                                prices["next_40tb"] = price
                            elif begin_range <= 51200:
                                prices["next_100tb"] = price
                            else:
                                prices["over_150tb"] = price
        except Exception as e:
            logger.debug(f"解析阶梯价格失败: {e}")

        return prices

    def _fill_missing_storage_classes(
        self, result: Dict[StorageClass, StorageClassPricing]
    ) -> None:
        """填充缺失的存储类型定价

        使用默认值填充无法从 API 获取的存储类型。

        Args:
            result: 已获取的定价字典，会被原地修改
        """
        for storage_class in StorageClass:
            if storage_class not in result:
                logger.info(f"使用默认定价: {storage_class.value}")
                result[storage_class] = self._create_default_pricing(storage_class)

    def _create_default_pricing(self, storage_class: StorageClass) -> StorageClassPricing:
        """创建默认存储类型定价

        Args:
            storage_class: 存储类型

        Returns:
            StorageClassPricing 实例
        """
        return StorageClassPricing(
            storage_per_gb_month=self._get_default_storage_price(storage_class),
            put_per_1000=self._get_default_put_price(storage_class),
            get_per_1000=self._get_default_get_price(storage_class),
            retrieval_per_gb=self._get_default_retrieval_price(storage_class),
            lifecycle_transition_per_1000=self._get_default_lifecycle_price(storage_class),
        )

    # 默认定价数据（基于 ap-northeast-1.json 的实际价格）
    # 注意：此数据必须与 backend/app/data/aws_pricing/ap-northeast-1.json 保持同步
    DEFAULT_PRICING = {
        StorageClass.STANDARD: {
            "storage": 0.025,  # 与 ap-northeast-1.json 同步
            "put": 0.005,
            "get": 0.0004,
            "retrieval": 0.0,
            "lifecycle": 0.0,
        },
        StorageClass.INTELLIGENT_TIERING: {
            # Frequent Access tier 价格，与 S3 Standard 相同
            # 注：Intelligent-Tiering 有多个层级，对象会根据访问模式自动移动
            # - Frequent Access: $0.025/GB (默认层级)
            # - Infrequent Access: $0.0138/GB (30天未访问)
            # - Archive Instant Access: $0.005/GB (90天未访问)
            "storage": 0.025,
            "put": 0.005,
            "get": 0.0004,
            "retrieval": 0.0,
            "lifecycle": 0.0,
        },
        StorageClass.STANDARD_IA: {
            "storage": 0.0125,
            "put": 0.01,
            "get": 0.001,
            "retrieval": 0.01,
            "lifecycle": 0.01,
        },
        StorageClass.ONEZONE_IA: {
            "storage": 0.01,
            "put": 0.01,
            "get": 0.001,
            "retrieval": 0.01,
            "lifecycle": 0.01,
        },
        StorageClass.GLACIER_IR: {
            "storage": 0.004,
            "put": 0.02,
            "get": 0.01,
            "retrieval": 0.03,
            "lifecycle": 0.02,
        },
        StorageClass.GLACIER_FR: {
            "storage": 0.0036,
            "put": 0.03,
            "get": 0.0004,
            "retrieval": 0.01,
            "lifecycle": 0.03,
        },
        StorageClass.DEEP_ARCHIVE: {
            "storage": 0.00099,
            "put": 0.05,
            "get": 0.0004,
            "retrieval": 0.02,
            "lifecycle": 0.05,
        },
    }

    def _get_default_price(
        self, storage_class: StorageClass, price_type: str
    ) -> float:
        """获取默认价格

        Args:
            storage_class: 存储类型
            price_type: 价格类型 (storage/put/get/retrieval/lifecycle)

        Returns:
            默认价格值
        """
        class_pricing = self.DEFAULT_PRICING.get(storage_class, self.DEFAULT_PRICING[StorageClass.STANDARD])
        return class_pricing.get(price_type, 0.0)

    def _get_default_storage_price(self, storage_class: StorageClass) -> float:
        """获取默认存储价格"""
        return self._get_default_price(storage_class, "storage")

    def _get_default_put_price(self, storage_class: StorageClass) -> float:
        """获取默认 PUT 请求价格"""
        return self._get_default_price(storage_class, "put")

    def _get_default_get_price(self, storage_class: StorageClass) -> float:
        """获取默认 GET 请求价格"""
        return self._get_default_price(storage_class, "get")

    def _get_default_retrieval_price(self, storage_class: StorageClass) -> float:
        """获取默认检索价格 (每 GB)"""
        return self._get_default_price(storage_class, "retrieval")

    def _get_default_lifecycle_price(self, storage_class: StorageClass) -> float:
        """获取默认生命周期转换价格 (每千次)"""
        return self._get_default_price(storage_class, "lifecycle")

    def test_connection(self) -> bool:
        """测试 API 连接

        Returns:
            True 如果连接成功，False 否则
        """
        try:
            self.client.describe_services(ServiceCode="AmazonS3", MaxResults=1)
            return True
        except Exception as e:
            logger.error(f"API 连接测试失败: {e}")
            return False
