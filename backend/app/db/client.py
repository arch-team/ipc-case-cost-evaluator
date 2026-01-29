"""数据库客户端工厂

根据配置返回适当的存储后端。
"""
from typing import Optional, Protocol, Any, Dict, List
from app.core.config import settings
from app.db.local_storage import LocalStorage
from app.db.dynamodb_client import DynamoDBClient


class StorageProtocol(Protocol):
    """存储协议定义"""

    def put(self, table: str, key: str, item: Dict[str, Any]) -> None:
        """存储项目"""
        ...

    def get(self, table: str, key: str) -> Optional[Dict[str, Any]]:
        """获取项目"""
        ...

    def delete(self, table: str, key: str) -> bool:
        """删除项目"""
        ...

    def query(
        self,
        table: str,
        attribute: str,
        value: Any,
    ) -> List[Dict[str, Any]]:
        """按属性查询"""
        ...

    def list_all(self, table: str) -> List[Dict[str, Any]]:
        """列出所有项目"""
        ...


# 全局存储实例
_storage_instance: Optional[StorageProtocol] = None


def get_storage() -> StorageProtocol:
    """
    获取存储实例

    根据配置返回 LocalStorage 或 DynamoDB 客户端。
    使用单例模式确保整个应用共享同一实例。

    Returns:
        存储实例
    """
    global _storage_instance

    if _storage_instance is None:
        if settings.use_local_storage:
            _storage_instance = LocalStorage()
        else:
            _storage_instance = DynamoDBClient()

    return _storage_instance


def reset_storage() -> None:
    """
    重置存储实例

    用于测试时清理状态。
    """
    global _storage_instance
    _storage_instance = None
