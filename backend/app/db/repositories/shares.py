"""分享记录仓库

实现分享记录的 CRUD 操作。
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.db.client import get_storage
from app.models.enums import SharePermission


class ShareRepository:
    """分享记录仓库"""

    def __init__(self):
        self.storage = get_storage()
        self.table = settings.DYNAMODB_SHARES_TABLE

    def create(
        self,
        user_id: str,
        evaluation_id: str,
        permission: SharePermission,
        expires_days: int = 7
    ) -> Dict[str, Any]:
        """
        创建分享记录

        Args:
            user_id: 用户 ID
            evaluation_id: 评估 ID
            permission: 分享权限
            expires_days: 过期天数

        Returns:
            分享记录
        """
        share_token = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=expires_days)

        share = {
            "share_token": share_token,
            "user_id": user_id,
            "evaluation_id": evaluation_id,
            "permission": permission.value,
            "expires_at": expires_at.isoformat(),
            "created_at": now.isoformat()
        }

        self.storage.put(self.table, share_token, share)
        return share

    def get_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        按 token 获取分享记录

        Args:
            token: 分享令牌

        Returns:
            分享记录，不存在或已过期返回 None
        """
        share = self.storage.get(self.table, token)
        if not share:
            return None

        # 检查是否过期
        expires_at = datetime.fromisoformat(share["expires_at"])
        if expires_at < datetime.now(timezone.utc):
            # 过期自动删除
            self.delete(token)
            return None

        return share

    def delete(self, token: str) -> bool:
        """
        删除分享记录

        Args:
            token: 分享令牌

        Returns:
            是否删除成功
        """
        return self.storage.delete(self.table, token)

    def list_by_evaluation(self, evaluation_id: str) -> List[Dict[str, Any]]:
        """
        列出评估的所有分享

        Args:
            evaluation_id: 评估 ID

        Returns:
            分享记录列表 (不含已过期)
        """
        shares = self.storage.query(self.table, "evaluation_id", evaluation_id)
        # 过滤掉已过期的
        now = datetime.now(timezone.utc)
        valid_shares = []
        for share in shares:
            expires_at = datetime.fromisoformat(share["expires_at"])
            if expires_at > now:
                valid_shares.append(share)
        return sorted(valid_shares, key=lambda x: x.get("created_at", ""), reverse=True)
