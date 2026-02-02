"""DynamoDB 存储客户端

用于生产环境的 AWS DynamoDB 存储实现。
"""
import logging
from decimal import Decimal
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


def _convert_numeric_types(obj: Any, converter) -> Any:
    """
    递归转换数据结构中的数值类型

    Args:
        obj: 任意数据结构
        converter: 转换函数 (用于 float -> Decimal 或 Decimal -> float)

    Returns:
        转换后的数据结构
    """
    if isinstance(obj, dict):
        return {k: _convert_numeric_types(v, converter) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_convert_numeric_types(item, converter) for item in obj]
    if isinstance(obj, tuple):
        return tuple(_convert_numeric_types(item, converter) for item in obj)
    return converter(obj)


def _float_to_decimal(value: Any) -> Any:
    """将 float 转换为 Decimal"""
    return Decimal(str(value)) if isinstance(value, float) else value


def _decimal_to_float(value: Any) -> Any:
    """将 Decimal 转换为 float"""
    return float(value) if isinstance(value, Decimal) else value


def _convert_floats_to_decimal(obj: Any) -> Any:
    """
    递归将数据结构中的 float 转换为 Decimal

    DynamoDB 不支持 float 类型，必须使用 Decimal。

    Args:
        obj: 任意数据结构

    Returns:
        转换后的数据结构
    """
    return _convert_numeric_types(obj, _float_to_decimal)


def _convert_decimals_to_float(obj: Any) -> Any:
    """
    递归将数据结构中的 Decimal 转换为 float

    从 DynamoDB 读取数据后，将 Decimal 转回 float 以便 JSON 序列化。

    Args:
        obj: 任意数据结构

    Returns:
        转换后的数据结构
    """
    return _convert_numeric_types(obj, _decimal_to_float)


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

    def _handle_client_error(self, error: ClientError, operation: str, table: str, **context) -> Any:
        """
        统一处理 ClientError 异常

        Args:
            error: ClientError 异常
            operation: 操作名称
            table: 表名
            **context: 额外的上下文信息

        Returns:
            根据错误类型返回合适的默认值
        """
        error_code = error.response.get("Error", {}).get("Code", "Unknown")

        if error_code == "ResourceNotFoundException":
            logger.warning("表 %s 不存在", table)
            return None

        context_str = ", ".join(f"{k}={v}" for k, v in context.items())
        logger.error("%s 失败 (表=%s, %s): %s", operation, table, context_str, error)
        return None

    def __init__(self, resource=None):
        """
        初始化 DynamoDB 客户端

        Args:
            resource: 可选的 DynamoDB 资源，用于测试注入
        """
        if resource:
            self._dynamodb = resource
            return

        self._dynamodb = self._create_dynamodb_resource()

    def _create_dynamodb_resource(self):
        """创建 DynamoDB 资源实例"""
        import os

        # Lambda 环境：使用默认凭证链
        if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
            return boto3.resource("dynamodb")

        # 本地环境：可以使用自定义凭证
        kwargs = {"region_name": settings.aws_region}
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            kwargs.update({
                "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
                "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY
            })
        return boto3.resource("dynamodb", **kwargs)

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
        # 将 float 转换为 Decimal（DynamoDB 不支持 float）
        converted_item = _convert_floats_to_decimal(item_with_pk)
        tbl.put_item(Item=converted_item)

    def get(
        self, table: str, key: str, sort_key: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        获取项目

        Args:
            table: 表名
            key: 主键值 (pk)
            sort_key: 排序键值 (sk)，用于复合键表

        Returns:
            数据项，不存在返回 None
        """
        tbl = self._get_table(table)
        try:
            key_dict: Dict[str, str] = {"pk": key}
            if sort_key is not None:
                key_dict["sk"] = sort_key
            response = tbl.get_item(Key=key_dict)
            item = response.get("Item")
            # 将 Decimal 转换回 float 以便 JSON 序列化
            return _convert_decimals_to_float(item) if item else None
        except ClientError as e:
            return self._handle_client_error(e, "获取项目", table, 键=key, sk=sort_key)

    def delete(self, table: str, key: str, sort_key: Optional[str] = None) -> bool:
        """
        删除项目

        Args:
            table: 表名
            key: 主键值 (pk)
            sort_key: 排序键值 (sk)，用于复合键表

        Returns:
            是否删除成功
        """
        tbl = self._get_table(table)
        try:
            key_dict: Dict[str, str] = {"pk": key}
            if sort_key is not None:
                key_dict["sk"] = sort_key

            # 先检查项目是否存在
            response = tbl.get_item(Key=key_dict)
            if "Item" not in response:
                return False

            tbl.delete_item(Key=key_dict)
            return True
        except ClientError as e:
            self._handle_client_error(e, "删除项目", table, 键=key, sk=sort_key)
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
                items = response.get("Items", [])
                # 将 Decimal 转换回 float
                return _convert_decimals_to_float(items)
            except ClientError as e:
                error_code = e.response.get("Error", {}).get("Code", "Unknown")
                if error_code == "ValidationException":
                    # GSI 不存在时回退到 scan
                    logger.debug("GSI %s 不存在，回退到 scan", gsi_name)
                else:
                    self._handle_client_error(e, "GSI 查询", table, GSI=gsi_name)

        # 回退到 scan（效率较低，但保证功能正确）
        from boto3.dynamodb.conditions import Attr

        response = tbl.scan(FilterExpression=Attr(attribute).eq(value))
        items = response.get("Items", [])
        # 将 Decimal 转换回 float
        return _convert_decimals_to_float(items)

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

        # 将 Decimal 转换回 float
        return _convert_decimals_to_float(items)

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
