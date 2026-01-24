"""本地内存存储实现

用于开发和测试环境，替代 DynamoDB。
"""
from typing import Any, Dict, List, Optional
from threading import Lock


class LocalStorage:
    """
    本地内存存储

    线程安全的内存存储实现，用于开发模式。
    """

    def __init__(self):
        self._data: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self._lock = Lock()

    def put(self, table: str, key: str, item: Dict[str, Any]) -> None:
        """
        存储项目

        Args:
            table: 表名
            key: 主键
            item: 数据项
        """
        with self._lock:
            if table not in self._data:
                self._data[table] = {}
            self._data[table][key] = item.copy()

    def get(self, table: str, key: str) -> Optional[Dict[str, Any]]:
        """
        获取项目

        Args:
            table: 表名
            key: 主键

        Returns:
            数据项，不存在返回 None
        """
        with self._lock:
            if table not in self._data:
                return None
            item = self._data[table].get(key)
            return item.copy() if item else None

    def delete(self, table: str, key: str) -> bool:
        """
        删除项目

        Args:
            table: 表名
            key: 主键

        Returns:
            是否删除成功
        """
        with self._lock:
            if table not in self._data:
                return False
            if key in self._data[table]:
                del self._data[table][key]
                return True
            return False

    def query(
        self,
        table: str,
        attribute: str,
        value: Any,
    ) -> List[Dict[str, Any]]:
        """
        按属性查询

        Args:
            table: 表名
            attribute: 属性名
            value: 属性值

        Returns:
            匹配的数据项列表
        """
        with self._lock:
            if table not in self._data:
                return []
            return [
                item.copy()
                for item in self._data[table].values()
                if item.get(attribute) == value
            ]

    def list_all(self, table: str) -> List[Dict[str, Any]]:
        """
        列出表中所有项目

        Args:
            table: 表名

        Returns:
            所有数据项列表
        """
        with self._lock:
            if table not in self._data:
                return []
            return [item.copy() for item in self._data[table].values()]

    def clear_table(self, table: str) -> None:
        """
        清空表

        Args:
            table: 表名
        """
        with self._lock:
            if table in self._data:
                self._data[table] = {}

    def clear_all(self) -> None:
        """清空所有数据"""
        with self._lock:
            self._data = {}
