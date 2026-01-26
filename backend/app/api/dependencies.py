"""API 依赖注入函数

提供权限检查、当前用户获取等通用依赖。
"""
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.models.enums import UserRole, UserStatus
from app.services.auth import AuthService


security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    获取当前用户依赖

    验证 JWT Token 并返回用户信息。

    Args:
        credentials: HTTP Bearer 认证凭据

    Returns:
        当前用户信息字典

    Raises:
        HTTPException: 401 未认证或 Token 无效
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="未提供认证令牌")

    service = AuthService()
    payload = service.verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="无效的认证令牌")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="无效的认证令牌")

    user = service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")

    # 检查用户状态
    if user.get("status") == UserStatus.DISABLED.value:
        raise HTTPException(status_code=403, detail="账号已被禁用")

    # 添加从 Token 中获取的角色信息（确保使用 Token 中的角色）
    user["role"] = payload.get("role", UserRole.USER.value)

    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    """
    获取当前用户（可选）

    如果提供了有效 Token 则返回用户信息，否则返回 None。
    用于可选认证的端点。

    Args:
        credentials: HTTP Bearer 认证凭据

    Returns:
        当前用户信息字典或 None
    """
    if not credentials:
        return None

    try:
        return get_current_user(credentials)
    except HTTPException:
        return None


def require_role(min_role: UserRole):
    """
    创建角色权限检查依赖

    Args:
        min_role: 最低要求的角色

    Returns:
        依赖函数，返回当前用户信息

    Usage:
        @router.get("/admin/users")
        async def list_users(user: dict = Depends(require_role(UserRole.ADMIN))):
            ...
    """
    def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = UserRole(current_user.get("role", UserRole.VIEWER.value))
        if user_role < min_role:
            raise HTTPException(
                status_code=403,
                detail=f"权限不足，需要 {min_role.value} 或更高权限"
            )
        return current_user
    return dependency


# 预定义的角色依赖
require_viewer = require_role(UserRole.VIEWER)
require_user = require_role(UserRole.USER)
require_admin = require_role(UserRole.ADMIN)
