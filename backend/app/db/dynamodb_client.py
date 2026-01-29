"""DynamoDB 存储客户端

用于生产环境的 AWS DynamoDB 存储实现。
"""
import logging
from typing import TYPE_CHECKING, Any, Dict, List, Optional

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import Table

logger = logging.getLogger(__name__)


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
            return

        # 在 Lambda 环境中，完全依赖默认凭证链（IAM 角色）
        import os
        if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
            # Lambda 环境：使用默认凭证链
            self._dynamodb = boto3.resource("dynamodb")
            return

        # 本地环境：可以使用自定义凭证
        kwargs = {"region_name": settings.aws_region}
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
        self._dynamodb = boto3.resource("dynamodb", **kwargs)

    def _get_table(self, table: str) -> "Table":
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
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            if error_code == "ResourceNotFoundException":
                logger.warning("表 %s 不存在", table)
            else:
                logger.error("获取项目失败 (表=%s, 键=%s): %s", table, key, e)
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
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            if error_code == "ResourceNotFoundException":
                logger.warning("表 %s 不存在", table)
            else:
                logger.error("删除项目失败 (表=%s, 键=%s): %s", table, key, e)
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
            except ClientError as e:
                error_code = e.response.get("Error", {}).get("Code", "Unknown")
                if error_code == "ValidationException":
                    # GSI 不存在时回退到 scan
                    logger.debug("GSI %s 不存在，回退到 scan", gsi_name)
                else:
                    logger.warning("GSI 查询失败 (表=%s, GSI=%s): %s", table, gsi_name, e)

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
        if not settings.DEBUG and not settings.use_local_storage:
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
        if not settings.DEBUG and not settings.use_local_storage:
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
            except ClientError as e:
                error_code = e.response.get("Error", {}).get("Code", "Unknown")
                if error_code == "ResourceNotFoundException":
                    # 表不存在，跳过
                    logger.debug("表 %s 不存在，跳过清理", table)
                else:
                    logger.warning("清理表 %s 失败: %s", table, e)
