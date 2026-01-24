"""数据库客户端测试"""
import pytest
from app.db.local_storage import LocalStorage
from app.db.client import get_storage


class TestLocalStorage:
    """本地存储测试"""

    @pytest.fixture
    def storage(self):
        """创建本地存储实例"""
        return LocalStorage()

    def test_put_and_get(self, storage):
        """测试存储和获取"""
        storage.put("test_table", "key1", {"name": "test", "value": 123})
        item = storage.get("test_table", "key1")

        assert item is not None
        assert item["name"] == "test"
        assert item["value"] == 123

    def test_get_nonexistent(self, storage):
        """测试获取不存在的项"""
        item = storage.get("test_table", "nonexistent")
        assert item is None

    def test_delete(self, storage):
        """测试删除"""
        storage.put("test_table", "key1", {"name": "test"})
        storage.delete("test_table", "key1")
        item = storage.get("test_table", "key1")

        assert item is None

    def test_query_by_attribute(self, storage):
        """测试按属性查询"""
        storage.put("test_table", "key1", {"user_id": "user1", "name": "item1"})
        storage.put("test_table", "key2", {"user_id": "user1", "name": "item2"})
        storage.put("test_table", "key3", {"user_id": "user2", "name": "item3"})

        items = storage.query("test_table", "user_id", "user1")

        assert len(items) == 2
        names = [item["name"] for item in items]
        assert "item1" in names
        assert "item2" in names

    def test_query_empty_result(self, storage):
        """测试查询空结果"""
        items = storage.query("test_table", "user_id", "nonexistent")
        assert len(items) == 0

    def test_update(self, storage):
        """测试更新"""
        storage.put("test_table", "key1", {"name": "old", "value": 1})
        storage.put("test_table", "key1", {"name": "new", "value": 2})
        item = storage.get("test_table", "key1")

        assert item["name"] == "new"
        assert item["value"] == 2

    def test_list_all(self, storage):
        """测试列出所有项"""
        storage.put("test_table", "key1", {"name": "item1"})
        storage.put("test_table", "key2", {"name": "item2"})

        items = storage.list_all("test_table")

        assert len(items) == 2

    def test_multiple_tables(self, storage):
        """测试多表操作"""
        storage.put("table1", "key1", {"data": "table1_data"})
        storage.put("table2", "key1", {"data": "table2_data"})

        item1 = storage.get("table1", "key1")
        item2 = storage.get("table2", "key1")

        assert item1["data"] == "table1_data"
        assert item2["data"] == "table2_data"

    def test_clear_table(self, storage):
        """测试清空表"""
        storage.put("test_table", "key1", {"name": "item1"})
        storage.put("test_table", "key2", {"name": "item2"})

        storage.clear_table("test_table")
        items = storage.list_all("test_table")

        assert len(items) == 0


class TestGetStorage:
    """存储工厂测试"""

    def test_get_local_storage(self):
        """测试获取本地存储"""
        # 默认配置使用本地存储
        storage = get_storage()
        assert isinstance(storage, LocalStorage)

    def test_storage_singleton(self):
        """测试存储单例"""
        storage1 = get_storage()
        storage2 = get_storage()
        # 应该是同一个实例
        assert storage1 is storage2


class TestLocalStorageEdgeCases:
    """本地存储边界测试"""

    @pytest.fixture
    def storage(self):
        """创建本地存储实例"""
        return LocalStorage()

    def test_put_complex_data(self, storage):
        """测试存储复杂数据"""
        complex_data = {
            "string": "text",
            "number": 123.45,
            "boolean": True,
            "list": [1, 2, 3],
            "nested": {"a": 1, "b": 2},
        }
        storage.put("test_table", "key1", complex_data)
        item = storage.get("test_table", "key1")

        assert item == complex_data

    def test_empty_key(self, storage):
        """测试空键"""
        storage.put("test_table", "", {"name": "empty_key"})
        item = storage.get("test_table", "")

        assert item["name"] == "empty_key"

    def test_special_characters_in_key(self, storage):
        """测试键中的特殊字符"""
        storage.put("test_table", "key/with/slashes", {"name": "special"})
        item = storage.get("test_table", "key/with/slashes")

        assert item["name"] == "special"
