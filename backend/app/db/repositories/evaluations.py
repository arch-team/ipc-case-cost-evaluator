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

    def list_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        """
        按用户列出评估记录

        Args:
            user_id: 用户 ID

        Returns:
            评估记录列表
        """
        evaluations = self.storage.query(self.table, "user_id", user_id)
        # 按创建时间倒序
        return sorted(evaluations, key=lambda x: x.get("created_at", ""), reverse=True)

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
