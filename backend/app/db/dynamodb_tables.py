"""DynamoDB 表定义和创建脚本

提供 DynamoDB 表的创建、删除和检查功能。
用于初始化生产环境或本地测试（LocalStack/DynamoDB Local）。
"""
import logging
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_dynamodb_resource(endpoint_url: Optional[str] = None):
    """
    获取 DynamoDB 资源

    Args:
        endpoint_url: 可选的端点 URL（用于 LocalStack 或 DynamoDB Local）

    Returns:
        DynamoDB 资源对象
    """
    kwargs = {
        "region_name": settings.AWS_REGION,
    }

    if settings.AWS_ACCESS_KEY_ID:
        kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
    if settings.AWS_SECRET_ACCESS_KEY:
        kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
    if endpoint_url:
        kwargs["endpoint_url"] = endpoint_url

    return boto3.resource("dynamodb", **kwargs)


# 表定义
TABLE_DEFINITIONS = {
    settings.DYNAMODB_USERS_TABLE: {
        "TableName": settings.DYNAMODB_USERS_TABLE,
        "KeySchema": [
            {"AttributeName": "pk", "KeyType": "HASH"},  # 主键 = user_id
        ],
        "AttributeDefinitions": [
            {"AttributeName": "pk", "AttributeType": "S"},
            {"AttributeName": "email", "AttributeType": "S"},
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "email-index",
                "KeySchema": [
                    {"AttributeName": "email", "KeyType": "HASH"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
        "BillingMode": "PAY_PER_REQUEST",  # 按需计费模式
    },
    settings.DYNAMODB_EVALUATIONS_TABLE: {
        "TableName": settings.DYNAMODB_EVALUATIONS_TABLE,
        "KeySchema": [
            {"AttributeName": "pk", "KeyType": "HASH"},  # 主键 = evaluation_id
        ],
        "AttributeDefinitions": [
            {"AttributeName": "pk", "AttributeType": "S"},
            {"AttributeName": "user_id", "AttributeType": "S"},
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "user_id-index",
                "KeySchema": [
                    {"AttributeName": "user_id", "KeyType": "HASH"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },
    settings.DYNAMODB_SHARES_TABLE: {
        "TableName": settings.DYNAMODB_SHARES_TABLE,
        "KeySchema": [
            {"AttributeName": "pk", "KeyType": "HASH"},  # 主键 = share_token
        ],
        "AttributeDefinitions": [
            {"AttributeName": "pk", "AttributeType": "S"},
            {"AttributeName": "evaluation_id", "AttributeType": "S"},
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "evaluation_id-index",
                "KeySchema": [
                    {"AttributeName": "evaluation_id", "KeyType": "HASH"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },
}


def create_table(dynamodb, table_name: str) -> bool:
    """
    创建单个 DynamoDB 表

    Args:
        dynamodb: DynamoDB 资源
        table_name: 表名

    Returns:
        是否创建成功
    """
    if table_name not in TABLE_DEFINITIONS:
        logger.warning("未知的表名: %s", table_name)
        return False

    table_def = TABLE_DEFINITIONS[table_name]

    try:
        # 检查表是否已存在
        dynamodb.meta.client.describe_table(TableName=table_name)
        logger.info("表 %s 已存在", table_name)
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] != "ResourceNotFoundException":
            logger.error("检查表 %s 时出错: %s", table_name, e)
            return False

    try:
        table = dynamodb.create_table(**table_def)
        # 等待表创建完成
        table.wait_until_exists()
        logger.info("表 %s 创建成功", table_name)
        return True
    except ClientError as e:
        logger.error("创建表 %s 时出错: %s", table_name, e)
        return False


def delete_table(dynamodb, table_name: str) -> bool:
    """
    删除 DynamoDB 表

    Args:
        dynamodb: DynamoDB 资源
        table_name: 表名

    Returns:
        是否删除成功
    """
    try:
        table = dynamodb.Table(table_name)
        table.delete()
        table.wait_until_not_exists()
        logger.info("表 %s 已删除", table_name)
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            logger.info("表 %s 不存在", table_name)
            return True
        logger.error("删除表 %s 时出错: %s", table_name, e)
        return False


def create_all_tables(endpoint_url: Optional[str] = None) -> bool:
    """
    创建所有 DynamoDB 表

    Args:
        endpoint_url: 可选的端点 URL

    Returns:
        是否全部创建成功
    """
    dynamodb = get_dynamodb_resource(endpoint_url)
    success = True

    for table_name in TABLE_DEFINITIONS:
        if not create_table(dynamodb, table_name):
            success = False

    return success


def delete_all_tables(endpoint_url: Optional[str] = None) -> bool:
    """
    删除所有 DynamoDB 表

    Args:
        endpoint_url: 可选的端点 URL

    Returns:
        是否全部删除成功
    """
    dynamodb = get_dynamodb_resource(endpoint_url)
    success = True

    for table_name in TABLE_DEFINITIONS:
        if not delete_table(dynamodb, table_name):
            success = False

    return success


def table_exists(dynamodb, table_name: str) -> bool:
    """
    检查表是否存在

    Args:
        dynamodb: DynamoDB 资源
        table_name: 表名

    Returns:
        表是否存在
    """
    try:
        dynamodb.meta.client.describe_table(TableName=table_name)
        return True
    except ClientError:
        return False


def get_table_info(endpoint_url: Optional[str] = None) -> dict:
    """
    获取所有表的信息

    Args:
        endpoint_url: 可选的端点 URL

    Returns:
        表信息字典
    """
    dynamodb = get_dynamodb_resource(endpoint_url)
    info = {}

    for table_name in TABLE_DEFINITIONS:
        try:
            response = dynamodb.meta.client.describe_table(TableName=table_name)
            table = response["Table"]
            info[table_name] = {
                "exists": True,
                "status": table.get("TableStatus"),
                "item_count": table.get("ItemCount", 0),
                "size_bytes": table.get("TableSizeBytes", 0),
            }
        except ClientError:
            info[table_name] = {"exists": False}

    return info


if __name__ == "__main__":
    """命令行入口"""
    import sys

    if len(sys.argv) < 2:
        print("用法:")
        print("  python -m app.db.dynamodb_tables create [endpoint_url]")
        print("  python -m app.db.dynamodb_tables delete [endpoint_url]")
        print("  python -m app.db.dynamodb_tables info [endpoint_url]")
        sys.exit(1)

    command = sys.argv[1]
    endpoint = sys.argv[2] if len(sys.argv) > 2 else None

    if command == "create":
        success = create_all_tables(endpoint)
        sys.exit(0 if success else 1)
    elif command == "delete":
        success = delete_all_tables(endpoint)
        sys.exit(0 if success else 1)
    elif command == "info":
        info = get_table_info(endpoint)
        for table_name, table_info in info.items():
            print(f"\n{table_name}:")
            for key, value in table_info.items():
                print(f"  {key}: {value}")
    else:
        print(f"未知命令: {command}")
        sys.exit(1)
