"""定价服务

整合 AWS Pricing API 和本地缓存，提供统一的定价查询接口。
采用 API 优先 + 本地回退策略，确保高可用性。
"""
import logging
from datetime import datetime, timedelta
from threading import Lock
from typing import Dict, Optional, Tuple

from app.models.pricing import PricingLoader, S3Pricing
from app.models.results import PricingMetadata
from app.services.aws_pricing_client import AWSPricingClient, AWSPricingAPIError

logger = logging.getLogger(__name__)


class PricingCache:
    """定价数据缓存

    线程安全的内存缓存，支持 TTL 过期。

    Attributes:
        _cache: 缓存数据字典
        _timestamps: 缓存时间戳字典
        _lock: 线程锁
        _ttl: 缓存过期时间
    """

    def __init__(self, ttl_hours: int = 24):
        """初始化缓存

        Args:
            ttl_hours: 缓存过期时间（小时）
        """
        self._cache: Dict[str, Tuple[S3Pricing, PricingMetadata]] = {}
        self._timestamps: Dict[str, datetime] = {}
        self._lock = Lock()
        self._ttl = timedelta(hours=ttl_hours)

    def get(self, region: str) -> Optional[Tuple[S3Pricing, PricingMetadata]]:
        """获取缓存的定价数据

        Args:
            region: AWS 区域代码

        Returns:
            (S3Pricing, PricingMetadata) 元组，如果缓存不存在或已过期返回 None
        """
        with self._lock:
            if region not in self._cache:
                return None

            # 检查是否过期
            timestamp = self._timestamps.get(region)
            if timestamp and datetime.now() - timestamp > self._ttl:
                logger.debug(f"缓存已过期: {region}")
                del self._cache[region]
                del self._timestamps[region]
                return None

            return self._cache[region]

    def set(
        self,
        region: str,
        pricing: S3Pricing,
        metadata: PricingMetadata,
    ) -> None:
        """设置缓存

        Args:
            region: AWS 区域代码
            pricing: 定价数据
            metadata: 定价元信息
        """
        with self._lock:
            self._cache[region] = (pricing, metadata)
            self._timestamps[region] = datetime.now()
            logger.debug(f"缓存已更新: {region}")

    def clear(self, region: Optional[str] = None) -> None:
        """清除缓存

        Args:
            region: 指定区域，None 表示清除所有
        """
        with self._lock:
            if region:
                self._cache.pop(region, None)
                self._timestamps.pop(region, None)
            else:
                self._cache.clear()
                self._timestamps.clear()

    def get_status(self) -> Dict[str, dict]:
        """获取缓存状态

        Returns:
            各区域的缓存状态
        """
        with self._lock:
            status = {}
            now = datetime.now()
            for region, (pricing, metadata) in self._cache.items():
                timestamp = self._timestamps.get(region)
                age = (now - timestamp).total_seconds() if timestamp else 0
                status[region] = {
                    "cached": True,
                    "source": metadata.source,
                    "updated_at": metadata.updated_at.isoformat(),
                    "is_fallback": metadata.is_fallback,
                    "age_seconds": age,
                    "expires_in_seconds": max(0, self._ttl.total_seconds() - age),
                }
            return status


class PricingService:
    """定价服务

    提供统一的定价查询接口，采用以下策略：
    1. 优先检查缓存
    2. 缓存未命中时调用 AWS Pricing API
    3. API 失败时回退到本地 JSON 文件

    Attributes:
        _cache: 定价缓存
        _api_client: AWS Pricing API 客户端（懒加载）
        _api_enabled: 是否启用 API
        _fallback_enabled: 是否启用本地回退
    """

    def __init__(
        self,
        cache_ttl_hours: int = 24,
        api_enabled: bool = True,
        fallback_enabled: bool = True,
    ):
        """初始化定价服务

        Args:
            cache_ttl_hours: 缓存过期时间（小时）
            api_enabled: 是否启用 AWS Pricing API
            fallback_enabled: 是否启用本地回退
        """
        self._cache = PricingCache(ttl_hours=cache_ttl_hours)
        self._api_client: Optional[AWSPricingClient] = None
        self._api_enabled = api_enabled
        self._fallback_enabled = fallback_enabled
        self._api_available: Optional[bool] = None

    @property
    def api_client(self) -> Optional[AWSPricingClient]:
        """懒加载 API 客户端"""
        if not self._api_enabled:
            return None

        if self._api_client is None:
            try:
                self._api_client = AWSPricingClient()
                self._api_available = self._api_client.test_connection()
                if not self._api_available:
                    logger.warning("AWS Pricing API 连接失败，将使用本地数据")
            except Exception as e:
                logger.warning(f"创建 AWS Pricing API 客户端失败: {e}")
                self._api_available = False

        return self._api_client if self._api_available else None

    def get_pricing(self, region: str) -> Tuple[S3Pricing, PricingMetadata]:
        """获取指定区域的定价数据

        优先级：缓存 > AWS API > 本地文件

        Args:
            region: AWS 区域代码

        Returns:
            (S3Pricing, PricingMetadata) 元组

        Raises:
            ValueError: 当无法获取定价数据时
        """
        # 1. 检查缓存
        cached = self._cache.get(region)
        if cached:
            logger.debug(f"使用缓存定价: {region}")
            return cached

        # 2. 尝试 AWS API
        if self.api_client:
            try:
                pricing = self.api_client.get_s3_pricing(region)
                metadata = PricingMetadata(
                    source="AWS_API",
                    updated_at=datetime.now(),
                    region=region,
                    is_fallback=False,
                )
                self._cache.set(region, pricing, metadata)
                # 同时更新本地 JSON 文件，确保回退数据也是最新的
                try:
                    PricingLoader.save(pricing)
                    logger.info(f"已更新本地定价文件: {region}")
                except Exception as save_error:
                    logger.warning(f"保存本地定价文件失败: {save_error}")
                logger.info(f"从 AWS API 获取定价成功: {region}")
                return pricing, metadata
            except AWSPricingAPIError as e:
                logger.warning(f"AWS API 获取定价失败: {e}")

        # 3. 回退到本地文件
        if self._fallback_enabled:
            return self._load_from_local(region)

        raise ValueError(f"无法获取 {region} 的定价数据")

    def _load_from_local(self, region: str) -> Tuple[S3Pricing, PricingMetadata]:
        """从本地文件加载定价

        Args:
            region: AWS 区域代码

        Returns:
            (S3Pricing, PricingMetadata) 元组

        Raises:
            ValueError: 当本地文件不存在时
        """
        try:
            pricing = PricingLoader.load(region)
            metadata = PricingMetadata(
                source="LOCAL_FALLBACK",
                updated_at=datetime.now(),
                region=region,
                is_fallback=True,
            )
            self._cache.set(region, pricing, metadata)
            logger.info(f"从本地文件加载定价: {region}")
            return pricing, metadata
        except ValueError:
            logger.error(f"本地定价文件不存在: {region}")
            raise

    def refresh_pricing(self, region: str) -> Tuple[S3Pricing, PricingMetadata]:
        """强制刷新定价数据

        清除缓存并重新获取。

        Args:
            region: AWS 区域代码

        Returns:
            (S3Pricing, PricingMetadata) 元组
        """
        self._cache.clear(region)
        return self.get_pricing(region)

    def get_pricing_status(self) -> Dict[str, dict]:
        """获取定价服务状态

        Returns:
            包含缓存状态和 API 可用性的字典
        """
        return {
            "api_enabled": self._api_enabled,
            "api_available": self._api_available,
            "fallback_enabled": self._fallback_enabled,
            "cache": self._cache.get_status(),
            "available_regions": PricingLoader.available_regions(),
        }

    def clear_cache(self, region: Optional[str] = None) -> None:
        """清除缓存

        Args:
            region: 指定区域，None 表示清除所有
        """
        self._cache.clear(region)
        logger.info(f"缓存已清除: {region or '所有区域'}")


# 全局单例实例
_pricing_service: Optional[PricingService] = None


def get_pricing_service() -> PricingService:
    """获取定价服务单例

    Returns:
        PricingService 实例
    """
    global _pricing_service
    if _pricing_service is None:
        _pricing_service = PricingService()
    return _pricing_service


def reset_pricing_service() -> None:
    """重置定价服务（用于测试）"""
    global _pricing_service
    _pricing_service = None
