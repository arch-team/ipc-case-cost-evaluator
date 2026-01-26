"""用户管理服务

提供用户查询、更新、解锁等管理功能。
"""
from typing import Dict, Any, List, Optional

from app.models.enums import UserRole, UserStatus
from app.services.auth import AuthService


class UserService:
    """用户管理服务"""

    def __init__(self):
        self._auth_service = AuthService()

    def get_all_users(
        self,
        role_filter: Optional[UserRole] = None,
        status_filter: Optional[UserStatus] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        获取用户列表

        Args:
            role_filter: 按角色筛选
            status_filter: 按状态筛选
            search: 搜索关键词（邮箱或名称）

        Returns:
            用户列表
        """
        return self._auth_service.get_all_users(
            role_filter=role_filter,
            status_filter=status_filter,
            search=search,
        )

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        根据 ID 获取用户

        Args:
            user_id: 用户 ID

        Returns:
            用户信息，不存在返回 None
        """
        return self._auth_service.get_user_by_id(user_id)

    def update_user(
        self,
        user_id: str,
        role: Optional[UserRole] = None,
        status: Optional[UserStatus] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        更新用户角色或状态

        Args:
            user_id: 用户 ID
            role: 新角色
            status: 新状态

        Returns:
            更新后的用户信息，不存在返回 None
        """
        return self._auth_service.admin_update_user(
            user_id=user_id,
            role=role,
            status=status,
        )

    def unlock_user(self, user_id: str) -> bool:
        """
        解锁用户账号

        Args:
            user_id: 用户 ID

        Returns:
            是否解锁成功
        """
        return self._auth_service.unlock_user(user_id)

    def count_active_admins(self) -> int:
        """统计活跃管理员数量"""
        return self._auth_service.count_admins()

    def is_last_admin(self, user_id: str) -> bool:
        """
        检查是否是最后一个活跃管理员

        Args:
            user_id: 用户 ID

        Returns:
            是否是最后一个活跃管理员
        """
        user = self._auth_service.get_user_by_id(user_id)
        if not user:
            return False

        if user.get("role") != UserRole.ADMIN.value:
            return False

        if user.get("status") != UserStatus.ACTIVE.value:
            return False

        return self.count_active_admins() <= 1
