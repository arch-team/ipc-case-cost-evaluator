"""DynamoDB 客户端测试

使用 moto 库模拟 AWS DynamoDB 进行测试。
"""
from decimal import Decimal

import boto3
import pytest
from moto import mock_aws

from app.core.config import settings
from app.db.dynamodb_client import DynamoDBClient
from app.db.dynamodb_tables import TABLE_DEFINITIONS


@pytest.fixture
def dynamodb_resource():
    """创建模拟的 DynamoDB 资源并创建表"""
    with mock_aws():
        dynamodb = boto3.resource("dynamodb", region_name="ap-northeast-1")

        # 创建所有测试表
        for table_def in TABLE_DEFINITIONS.values():
            dynamodb.create_table(**table_def)

        yield dynamodb


@pytest.fixture
def client(dynamodb_resource):
    """创建 DynamoDB 客户端实例"""
    return DynamoDBClient(resource=dynamodb_resource)


class TestDynamoDBClientBasicOperations:
    """DynamoDB 客户端基本操作测试"""

    def test_put_and_get(self, client):
        """测试存储和获取"""
        client.put(
            settings.DYNAMODB_USERS_TABLE,
            "user123",
            {"name": "测试用户", "email": "test@example.com"},
        )
        item = client.get(settings.DYNAMODB_USERS_TABLE, "user123")

        assert item is not None
        assert item["pk"] == "user123"
        assert item["name"] == "测试用户"
        assert item["email"] == "test@example.com"

    def test_get_nonexistent(self, client):
        """测试获取不存在的项"""
        item = client.get(settings.DYNAMODB_USERS_TABLE, "nonexistent")
        assert item is None

    def test_update_item(self, client):
        """测试更新项目"""
        client.put(
            settings.DYNAMODB_USERS_TABLE,
            "user123",
            {"name": "旧名字", "email": "old@example.com"},
        )
        client.put(
            settings.DYNAMODB_USERS_TABLE,
            "user123",
            {"name": "新名字", "email": "new@example.com"},
        )
        item = client.get(settings.DYNAMODB_USERS_TABLE, "user123")

        assert item["name"] == "新名字"
        assert item["email"] == "new@example.com"

    def test_delete_existing(self, client):
        """测试删除存在的项"""
        client.put(
            settings.DYNAMODB_USERS_TABLE,
            "user123",
            {"name": "测试用户"},
        )
        result = client.delete(settings.DYNAMODB_USERS_TABLE, "user123")

        assert result is True
        item = client.get(settings.DYNAMODB_USERS_TABLE, "user123")
        assert item is None

    def test_delete_nonexistent(self, client):
        """测试删除不存在的项"""
        result = client.delete(settings.DYNAMODB_USERS_TABLE, "nonexistent")
        assert result is False


class TestDynamoDBClientQuery:
    """DynamoDB 客户端查询测试"""

    def test_query_by_pk(self, client):
        """测试按主键查询"""
        client.put(
            settings.DYNAMODB_USERS_TABLE,
            "user123",
            {"name": "测试用户"},
        )
        items = client.query(settings.DYNAMODB_USERS_TABLE, "pk", "user123")

        assert len(items) == 1
        assert items[0]["name"] == "测试用户"

    def test_query_by_email_gsi(self, client):
        """测试使用 email GSI 查询"""
        client.put(
            settings.DYNAMODB_USERS_TABLE,
            "user123",
            {"email": "test@example.com", "name": "测试用户"},
        )
        items = client.query(settings.DYNAMODB_USERS_TABLE, "email", "test@example.com")

        assert len(items) == 1
        assert items[0]["name"] == "测试用户"

    def test_query_by_user_id_gsi(self, client):
        """测试使用 user_id GSI 查询评估"""
        client.put(
            settings.DYNAMODB_EVALUATIONS_TABLE,
            "eval1",
            {"user_id": "user123", "name": "评估1"},
        )
        client.put(
            settings.DYNAMODB_EVALUATIONS_TABLE,
            "eval2",
            {"user_id": "user123", "name": "评估2"},
        )
        client.put(
            settings.DYNAMODB_EVALUATIONS_TABLE,
            "eval3",
            {"user_id": "user456", "name": "评估3"},
        )

        items = client.query(
            settings.DYNAMODB_EVALUATIONS_TABLE, "user_id", "user123"
        )

        assert len(items) == 2
        names = [item["name"] for item in items]
        assert "评估1" in names
        assert "评估2" in names

    def test_query_by_evaluation_id_gsi(self, client):
        """测试使用 evaluation_id GSI 查询分享"""
        client.put(
            settings.DYNAMODB_SHARES_TABLE,
            "share1",
            {"evaluation_id": "eval123", "permission": "read"},
        )
        client.put(
            settings.DYNAMODB_SHARES_TABLE,
            "share2",
            {"evaluation_id": "eval123", "permission": "write"},
        )

        items = client.query(
            settings.DYNAMODB_SHARES_TABLE, "evaluation_id", "eval123"
        )

        assert len(items) == 2
        permissions = [item["permission"] for item in items]
        assert "read" in permissions
        assert "write" in permissions

    def test_query_empty_result(self, client):
        """测试查询空结果"""
        items = client.query(settings.DYNAMODB_USERS_TABLE, "email", "nonexistent@example.com")
        assert len(items) == 0

    def test_query_fallback_to_scan(self, client):
        """测试没有 GSI 时回退到 scan"""
        client.put(
            settings.DYNAMODB_USERS_TABLE,
            "user123",
            {"name": "张三", "email": "zhang@example.com"},
        )
        client.put(
            settings.DYNAMODB_USERS_TABLE,
            "user456",
            {"name": "张三", "email": "zhang2@example.com"},
        )

        # name 属性没有 GSI，应该使用 scan
        items = client.query(settings.DYNAMODB_USERS_TABLE, "name", "张三")

        assert len(items) == 2


class TestDynamoDBClientListAll:
    """DynamoDB 客户端 list_all 测试"""

    def test_list_all_empty(self, client):
        """测试列出空表"""
        items = client.list_all(settings.DYNAMODB_USERS_TABLE)
        assert len(items) == 0

    def test_list_all_with_items(self, client):
        """测试列出所有项目"""
        client.put(settings.DYNAMODB_USERS_TABLE, "user1", {"name": "用户1"})
        client.put(settings.DYNAMODB_USERS_TABLE, "user2", {"name": "用户2"})
        client.put(settings.DYNAMODB_USERS_TABLE, "user3", {"name": "用户3"})

        items = client.list_all(settings.DYNAMODB_USERS_TABLE)

        assert len(items) == 3
        names = [item["name"] for item in items]
        assert "用户1" in names
        assert "用户2" in names
        assert "用户3" in names


class TestDynamoDBClientClear:
    """DynamoDB 客户端清理测试"""

    def test_clear_table(self, client):
        """测试清空表"""
        client.put(settings.DYNAMODB_USERS_TABLE, "user1", {"name": "用户1"})
        client.put(settings.DYNAMODB_USERS_TABLE, "user2", {"name": "用户2"})

        client.clear_table(settings.DYNAMODB_USERS_TABLE)
        items = client.list_all(settings.DYNAMODB_USERS_TABLE)

        assert len(items) == 0

    def test_clear_all(self, client):
        """测试清空所有表"""
        client.put(settings.DYNAMODB_USERS_TABLE, "user1", {"name": "用户1"})
        client.put(settings.DYNAMODB_EVALUATIONS_TABLE, "eval1", {"name": "评估1"})
        client.put(settings.DYNAMODB_SHARES_TABLE, "share1", {"permission": "read"})

        client.clear_all()

        assert len(client.list_all(settings.DYNAMODB_USERS_TABLE)) == 0
        assert len(client.list_all(settings.DYNAMODB_EVALUATIONS_TABLE)) == 0
        assert len(client.list_all(settings.DYNAMODB_SHARES_TABLE)) == 0


class TestDynamoDBClientComplexData:
    """DynamoDB 客户端复杂数据测试"""

    def test_put_nested_data(self, client):
        """测试存储嵌套数据"""
        # DynamoDB 不支持 float，需要使用 Decimal
        complex_data = {
            "name": "测试",
            "input_data": {
                "functional": {"device_count": 10},
                "technical": {"storage_class": "STANDARD"},
            },
            "result": {
                "storage_cost": Decimal("100.50"),
                "total_cost": Decimal("150.75"),
            },
        }
        client.put(settings.DYNAMODB_EVALUATIONS_TABLE, "eval123", complex_data)
        item = client.get(settings.DYNAMODB_EVALUATIONS_TABLE, "eval123")

        assert item["name"] == "测试"
        assert item["input_data"]["functional"]["device_count"] == 10
        assert item["result"]["total_cost"] == Decimal("150.75")

    def test_put_with_list(self, client):
        """测试存储列表数据"""
        data = {
            "name": "测试",
            "tags": ["标签1", "标签2", "标签3"],
        }
        client.put(settings.DYNAMODB_USERS_TABLE, "user123", data)
        item = client.get(settings.DYNAMODB_USERS_TABLE, "user123")

        assert item["tags"] == ["标签1", "标签2", "标签3"]


class TestDynamoDBClientMultipleTables:
    """DynamoDB 客户端多表操作测试"""

    def test_operations_on_different_tables(self, client):
        """测试在不同表上的操作"""
        # 在用户表存储
        client.put(
            settings.DYNAMODB_USERS_TABLE,
            "user123",
            {"email": "test@example.com"},
        )
        # 在评估表存储
        client.put(
            settings.DYNAMODB_EVALUATIONS_TABLE,
            "eval123",
            {"user_id": "user123", "name": "评估1"},
        )
        # 在分享表存储
        client.put(
            settings.DYNAMODB_SHARES_TABLE,
            "share123",
            {"evaluation_id": "eval123", "permission": "read"},
        )

        # 验证各表数据独立
        user = client.get(settings.DYNAMODB_USERS_TABLE, "user123")
        evaluation = client.get(settings.DYNAMODB_EVALUATIONS_TABLE, "eval123")
        share = client.get(settings.DYNAMODB_SHARES_TABLE, "share123")

        assert user["email"] == "test@example.com"
        assert evaluation["name"] == "评估1"
        assert share["permission"] == "read"

        # 验证跨表查询不会混淆
        user_evals = client.query(
            settings.DYNAMODB_EVALUATIONS_TABLE, "user_id", "user123"
        )
        assert len(user_evals) == 1

        eval_shares = client.query(
            settings.DYNAMODB_SHARES_TABLE, "evaluation_id", "eval123"
        )
        assert len(eval_shares) == 1
