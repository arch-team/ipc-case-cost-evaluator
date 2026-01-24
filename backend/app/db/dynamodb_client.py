"""DynamoDB 存储客户端

用于生产环境的 AWS DynamoDB 存储实现。
"""
from typing import Any, Dict, List, Optional
import boto3
from botocore.exceptions import ClientError

from app.core.config import settings


class DynamoDBClient:
    """
    DynamoDB 存储客户端

    实现 StorageProtocol 协议，用于生产环境。
    """

    # GSI 映射：属性名 -> GSI 名称
    GSI_MAPPING = {
        "email": "email-index",
        "user_id": "user_id-index",
        "evaluation_id": "evaluation_id-index",
    }

    def __init__(self, resource=None):
        """
        初始化 DynamoDB 客户端

        Args:
            resource: 可选的 DynamoDB 资源，用于测试注入
        """
        if resource:
            self._dynamodb = resource
        else:
            # 构建 boto3 配置参数
            kwargs = {"region_name": settings.AWS_REGION}
            # 仅在明确配置时才传递凭证，否则让 boto3 使用默认凭证链
            # （环境变量、~/.aws/credentials、IAM 角色等）
            if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
                kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
                kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
            self._dynamodb = boto3.resource("dynamodb", **kwargs)

    def _get_table(self, table: str):
        """
        获取 DynamoDB 表对象

        Args:
            table: 表名

        Returns:
            DynamoDB Table 对象
        """
        return self._dynamodb.Table(table)

    def put(self, table: str, key: str, item: Dict[str, Any]) -> None:
        """
        存储项目

        Args:
            table: 表名
            key: 主键值
            item: 数据项
        """
        tbl = self._get_table(table)
        # 确保主键字段存在
        item_with_pk = {"pk": key, **item}
        tbl.put_item(Item=item_with_pk)

    def get(self, table: str, key: str) -> Optional[Dict[str, Any]]:
        """
        获取项目

        Args:
            table: 表名
            key: 主键值

        Returns:
            数据项，不存在返回 None
        """
        tbl = self._get_table(table)
        try:
            response = tbl.get_item(Key={"pk": key})
            return response.get("Item")
        except ClientError:
            return None

    def delete(self, table: str, key: str) -> bool:
        """
        删除项目

        Args:
            table: 表名
            key: 主键值

        Returns:
            是否删除成功
        """
        tbl = self._get_table(table)
        try:
            # 先检查项目是否存在
            response = tbl.get_item(Key={"pk": key})
            if "Item" not in response:
                return False

            tbl.delete_item(Key={"pk": key})
            return True
        except ClientError:
            return False

    def query(
        self,
        table: str,
        attribute: str,
        value: Any,
    ) -> List[Dict[str, Any]]:
        """
        按属性查询

        如果属性有对应的 GSI，使用 GSI 查询；
        否则使用 scan 进行过滤。

        Args:
            table: 表名
            attribute: 属性名
            value: 属性值

        Returns:
            匹配的数据项列表
        """
        tbl = self._get_table(table)

        # 如果属性是主键，直接 get
        if attribute == "pk":
            item = self.get(table, value)
            return [item] if item else []

        # 检查是否有对应的 GSI
        gsi_name = self.GSI_MAPPING.get(attribute)

        if gsi_name:
            # 使用 GSI 查询
            try:
                from boto3.dynamodb.conditions import Key

                response = tbl.query(
                    IndexName=gsi_name,
                    KeyConditionExpression=Key(attribute).eq(value),
                )
                return response.get("Items", [])
            except ClientError:
                # GSI 不存在时回退到 scan
                pass

        # 回退到 scan（效率较低，但保证功能正确）
        from boto3.dynamodb.conditions import Attr

        response = tbl.scan(FilterExpression=Attr(attribute).eq(value))
        return response.get("Items", [])

    def list_all(self, table: str) -> List[Dict[str, Any]]:
        """
        列出表中所有项目

        使用 scan 操作遍历整个表。
        注意：对于大表，此操作可能较慢。

        Args:
            table: 表名

        Returns:
            所有数据项列表
        """
        tbl = self._get_table(table)
        items = []

        # 处理分页
        response = tbl.scan()
        items.extend(response.get("Items", []))

        # 继续扫描直到没有更多数据
        while "LastEvaluatedKey" in response:
            response = tbl.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
            items.extend(response.get("Items", []))

        return items

    def clear_table(self, table: str) -> None:
        """
        清空表（仅用于测试）

        警告：此操作会删除表中所有数据！
        仅在 DEBUG 模式或本地存储模式下可用。

        Args:
            table: 表名

        Raises:
            RuntimeError: 在生产环境调用此方法
        """
        # 安全检查：仅允许在测试/开发环境使用
        if not settings.DEBUG and not settings.USE_LOCAL_STORAGE:
            raise RuntimeError(
                "clear_table 仅允许在测试环境使用（DEBUG=True 或 USE_LOCAL_STORAGE=True）"
            )

        tbl = self._get_table(table)
        items = self.list_all(table)

        # 批量删除所有项目
        with tbl.batch_writer() as batch:
            for item in items:
                if "pk" in item:
                    batch.delete_item(Key={"pk": item["pk"]})

    def clear_all(self) -> None:
        """
        清空所有表（仅用于测试）

        警告：此操作会删除所有配置表中的数据！
        仅在 DEBUG 模式或本地存储模式下可用。

        Raises:
            RuntimeError: 在生产环境调用此方法
        """
        # 安全检查：仅允许在测试/开发环境使用
        if not settings.DEBUG and not settings.USE_LOCAL_STORAGE:
            raise RuntimeError(
                "clear_all 仅允许在测试环境使用（DEBUG=True 或 USE_LOCAL_STORAGE=True）"
            )

        tables = [
            settings.DYNAMODB_USERS_TABLE,
            settings.DYNAMODB_EVALUATIONS_TABLE,
            settings.DYNAMODB_SHARES_TABLE,
        ]
        for table in tables:
            try:
                self.clear_table(table)
            except ClientError:
                # 表可能不存在，忽略错误
                pass
