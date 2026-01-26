"""系统统计服务

提供系统使用统计功能。
"""
from typing import Dict, Any

from app.core.config import settings
from app.db.client import get_storage
from app.models.enums import UserRole, UserStatus


class StatsService:
    """系统统计服务"""

    def __init__(self):
        self._storage = get_storage()

    def get_system_stats(self) -> Dict[str, Any]:
        """
        获取系统统计信息

        Returns:
            系统统计字典
        """
        # 获取所有用户
        users = self._storage.list_all(settings.DYNAMODB_USERS_TABLE)

        # 统计用户数据
        total_users = len(users)
        active_users = sum(
            1 for u in users
            if u.get("status", UserStatus.ACTIVE.value) == UserStatus.ACTIVE.value
        )
        disabled_users = total_users - active_users
        admin_count = sum(
            1 for u in users
            if u.get("role") == UserRole.ADMIN.value
            and u.get("status", UserStatus.ACTIVE.value) == UserStatus.ACTIVE.value
        )

        # 获取评估和分享统计
        evaluations = self._storage.list_all(settings.DYNAMODB_EVALUATIONS_TABLE)
        shares = self._storage.list_all(settings.DYNAMODB_SHARES_TABLE)

        return {
            "total_users": total_users,
            "active_users": active_users,
            "disabled_users": disabled_users,
            "admin_count": admin_count,
            "total_evaluations": len(evaluations),
            "total_shares": len(shares),
        }
