"""核算记录仓库

提供核算记录的数据访问层，支持：
- 创建记录
- 获取单条记录
- 列出用户记录（分页、搜索、排序）
- 删除记录
- 用户记录数量统计
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.db.client import get_storage
from app.models.calculation_records import (
    CalculationRecord,
    CalculationRecordSummary,
    CalculationRecordListResponse,
    StorageStrategy,
)


# 用户记录数量上限
MAX_RECORDS_PER_USER = 1000


class CalculationRecordRepository:
    """核算记录仓库"""

    def __init__(self):
        self.storage = get_storage()
        self.table = settings.DYNAMODB_CALCULATION_RECORDS_TABLE

    def create(self, record: CalculationRecord) -> CalculationRecord:
        """创建核算记录

        Args:
            record: 核算记录

        Returns:
            创建的核算记录

        Raises:
            ValueError: 当用户记录数量达到上限时
        """
        # 检查用户记录数量
        count = self.count_by_user(record.user_id)
        if count >= MAX_RECORDS_PER_USER:
            raise ValueError(
                f"已达到存储上限（{MAX_RECORDS_PER_USER}条），请删除旧记录后再保存"
            )

        # 构建存储数据
        data = record.model_dump(mode="json")

        # 使用 user_id 作为 pk, record_id 作为 sk
        data["pk"] = record.user_id
        data["sk"] = record.record_id

        self.storage.put(self.table, record.record_id, data)
        return record

    def get(self, user_id: str, record_id: str) -> Optional[CalculationRecord]:
        """获取单条核算记录

        Args:
            user_id: 用户 ID (作为 pk)
            record_id: 记录 ID (作为 sk)

        Returns:
            核算记录，不存在返回 None
        """
        # 使用 user_id 作为 pk，record_id 作为 sk 进行查询
        data = self.storage.get(self.table, user_id, sort_key=record_id)
        if not data:
            return None

        return self._parse_record(data)

    def list_by_user(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> CalculationRecordListResponse:
        """列出用户的核算记录

        Args:
            user_id: 用户 ID
            page: 页码（从 1 开始）
            page_size: 每页数量
            search: 按名称搜索
            sort_by: 排序字段 (created_at, name, total_cost)
            sort_order: 排序顺序 (asc, desc)

        Returns:
            核算记录列表响应
        """
        # 获取用户所有记录
        records = self.storage.query(self.table, "user_id", user_id)

        # 搜索过滤
        if search:
            search_lower = search.lower()
            records = [
                r for r in records
                if search_lower in r.get("name", "").lower()
            ]

        # 排序
        sort_keys = {
            "name": lambda x: x.get("name", "").lower(),
            "total_cost": lambda x: x.get("cost_summary", {}).get("total_cost", 0),
            "created_at": lambda x: x.get("created_at", ""),
        }

        sort_key_func = sort_keys.get(sort_by, sort_keys["created_at"])
        records = sorted(records, key=sort_key_func, reverse=(sort_order == "desc"))

        # 计算总数
        total = len(records)

        # 分页
        start = (page - 1) * page_size
        end = start + page_size
        page_records = records[start:end]

        # 转换为摘要
        items = [self._to_summary(r) for r in page_records]

        return CalculationRecordListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    def delete(self, user_id: str, record_id: str) -> bool:
        """删除核算记录

        Args:
            user_id: 用户 ID (作为 pk)
            record_id: 记录 ID (作为 sk)

        Returns:
            是否删除成功
        """
        # 使用 user_id 作为 pk，record_id 作为 sk 进行删除
        return self.storage.delete(self.table, user_id, sort_key=record_id)

    def count_by_user(self, user_id: str) -> int:
        """统计用户的记录数量

        Args:
            user_id: 用户 ID

        Returns:
            记录数量
        """
        records = self.storage.query(self.table, "user_id", user_id)
        return len(records)

    def get_batch(self, user_id: str, record_ids: List[str]) -> List[CalculationRecord]:
        """批量获取记录

        Args:
            user_id: 用户 ID
            record_ids: 记录 ID 列表

        Returns:
            核算记录列表（保持传入顺序）
        """
        records = []
        for record_id in record_ids:
            record = self.get(user_id=user_id, record_id=record_id)
            if record:
                records.append(record)
        return records

    def _parse_datetime(self, datetime_str: Any) -> datetime:
        """解析日期时间字符串"""
        if isinstance(datetime_str, str):
            return datetime.fromisoformat(datetime_str.replace("Z", "+00:00"))
        return datetime_str

    def _parse_record(self, data: Dict[str, Any]) -> CalculationRecord:
        """解析存储数据为 CalculationRecord"""
        # 移除存储层字段
        data.pop("pk", None)
        data.pop("sk", None)

        # 处理枚举转换
        if "storage_strategy" in data and isinstance(data["storage_strategy"], str):
            data["storage_strategy"] = StorageStrategy(data["storage_strategy"])

        # 处理日期时间
        if "created_at" in data:
            data["created_at"] = self._parse_datetime(data["created_at"])

        return CalculationRecord(**data)

    def _to_summary(self, data: Dict[str, Any]) -> CalculationRecordSummary:
        """转换为摘要"""
        cost_summary = data.get("cost_summary", {})

        return CalculationRecordSummary(
            record_id=data.get("record_id", ""),
            name=data.get("name", ""),
            storage_strategy=StorageStrategy(data.get("storage_strategy", "single_standard")),
            total_cost=cost_summary.get("total_cost", 0),
            created_at=self._parse_datetime(data.get("created_at", "")),
        )
