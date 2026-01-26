"""评估记录仓库"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.db.client import get_storage


class EvaluationRepository:
    """评估记录仓库"""

    def __init__(self):
        self.storage = get_storage()
        self.table = settings.DYNAMODB_EVALUATIONS_TABLE

    def create(
        self,
        user_id: str,
        name: str,
        input_data: Dict[str, Any],
        result: Dict[str, Any],
        description: str = "",
    ) -> Dict[str, Any]:
        """
        创建评估记录

        Args:
            user_id: 用户 ID
            name: 评估名称
            input_data: 输入参数
            result: 计算结果
            description: 描述

        Returns:
            评估记录
        """
        eval_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        evaluation = {
            "id": eval_id,
            "user_id": user_id,
            "name": name,
            "description": description,
            "input_data": input_data,
            "result": result,
            "created_at": now,
            "updated_at": now,
        }

        self.storage.put(self.table, eval_id, evaluation)
        return evaluation

    def get(self, eval_id: str) -> Optional[Dict[str, Any]]:
        """
        获取评估记录

        Args:
            eval_id: 评估 ID

        Returns:
            评估记录，不存在返回 None
        """
        return self.storage.get(self.table, eval_id)

    def list_by_user(
        self,
        user_id: str,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> List[Dict[str, Any]]:
        """
        按用户列出评估记录

        Args:
            user_id: 用户 ID
            search: 搜索关键词（匹配名称或描述）
            sort_by: 排序字段
            sort_order: 排序顺序

        Returns:
            评估记录列表
        """
        evaluations = self.storage.query(self.table, "user_id", user_id)

        # 搜索过滤
        if search:
            search_lower = search.lower()
            evaluations = [
                e for e in evaluations
                if search_lower in e.get("name", "").lower()
                or search_lower in e.get("description", "").lower()
            ]

        # 排序
        reverse = sort_order == "desc"
        if sort_by == "name":
            evaluations = sorted(
                evaluations,
                key=lambda x: x.get("name", "").lower(),
                reverse=reverse,
            )
        else:
            evaluations = sorted(
                evaluations,
                key=lambda x: x.get(sort_by, ""),
                reverse=reverse,
            )

        return evaluations

    def update(
        self,
        eval_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        更新评估记录

        Args:
            eval_id: 评估 ID
            name: 新名称
            description: 新描述

        Returns:
            更新后的评估记录，不存在返回 None
        """
        evaluation = self.get(eval_id)
        if not evaluation:
            return None

        if name is not None:
            evaluation["name"] = name
        if description is not None:
            evaluation["description"] = description

        evaluation["updated_at"] = datetime.now(timezone.utc).isoformat()
        self.storage.put(self.table, eval_id, evaluation)
        return evaluation

    def delete(self, eval_id: str) -> bool:
        """
        删除评估记录

        Args:
            eval_id: 评估 ID

        Returns:
            是否删除成功
        """
        return self.storage.delete(self.table, eval_id)
