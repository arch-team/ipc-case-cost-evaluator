"""管理员 API 路由

提供用户管理和系统统计功能，仅限管理员访问。
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query

from app.api.dependencies import require_role
from app.models.enums import UserRole, UserStatus
from app.models.user import (
    UserResponse,
    UserListResponse,
    AdminUserUpdate,
    SystemStats,
    MessageResponse,
)
from app.services.user_service import UserService
from app.services.stats_service import StatsService

router = APIRouter(prefix="/admin", tags=["管理员"])


@router.get("/users", response_model=UserListResponse)
async def list_users(
    role: Optional[UserRole] = Query(default=None, description="按角色筛选"),
    status: Optional[UserStatus] = Query(default=None, description="按状态筛选"),
    search: Optional[str] = Query(default=None, description="搜索邮箱或名称"),
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
) -> UserListResponse:
    """
    获取用户列表

    管理员查看所有用户，支持按角色、状态筛选和搜索。

    Args:
        role: 按角色筛选
        status: 按状态筛选
        search: 搜索关键词

    Returns:
        用户列表
    """
    service = UserService()
    users = service.get_all_users(
        role_filter=role,
        status_filter=status,
        search=search,
    )
    return UserListResponse(
        users=[UserResponse(**u) for u in users],
        total=len(users),
    )


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
) -> UserResponse:
    """
    获取指定用户详情

    Args:
        user_id: 用户 ID

    Returns:
        用户详情

    Raises:
        404: 用户不存在
    """
    service = UserService()
    user = service.get_user_by_id(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    return UserResponse(**user)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    request: AdminUserUpdate,
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
) -> UserResponse:
    """
    更新用户角色或状态

    管理员可以修改其他用户的角色和状态。
    不能修改自己，不能降级或禁用最后一个活跃管理员。

    Args:
        user_id: 用户 ID
        request: 更新请求（角色、状态）

    Returns:
        更新后的用户信息

    Raises:
        400: 操作不允许（如降级最后一个管理员）
        403: 不能修改自己
        404: 用户不存在
    """
    service = UserService()

    # 检查用户是否存在
    user = service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 不能修改自己
    if user_id == current_user["id"]:
        raise HTTPException(status_code=403, detail="不能修改自己的角色或状态")

    # 检查是否是降级或禁用管理员
    is_demoting_admin = (
        request.role is not None
        and request.role != UserRole.ADMIN
        and user.get("role") == UserRole.ADMIN.value
    )
    is_disabling_admin = (
        request.status == UserStatus.DISABLED
        and user.get("role") == UserRole.ADMIN.value
        and user.get("status") == UserStatus.ACTIVE.value
    )

    # 检查是否是最后一个管理员
    if (is_demoting_admin or is_disabling_admin) and service.is_last_admin(user_id):
        raise HTTPException(
            status_code=400,
            detail="不能降级或禁用最后一个活跃管理员"
        )

    # 执行更新
    updated_user = service.update_user(
        user_id=user_id,
        role=request.role,
        status=request.status,
    )

    if not updated_user:
        raise HTTPException(status_code=500, detail="更新失败")

    return UserResponse(**updated_user)


@router.post("/users/{user_id}/unlock", response_model=MessageResponse)
async def unlock_user(
    user_id: str,
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
) -> MessageResponse:
    """
    解锁用户账号

    管理员手动解锁被锁定的用户账号。

    Args:
        user_id: 用户 ID

    Returns:
        解锁结果消息

    Raises:
        404: 用户不存在
    """
    service = UserService()

    # 检查用户是否存在
    user = service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    success = service.unlock_user(user_id)
    if not success:
        raise HTTPException(status_code=500, detail="解锁失败")

    return MessageResponse(message=f"用户 {user.get('email')} 已解锁")


@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
) -> SystemStats:
    """
    获取系统统计信息

    管理员查看系统使用统计，包括用户数、评估数、分享数等。

    Returns:
        系统统计信息
    """
    service = StatsService()
    stats = service.get_system_stats()
    return SystemStats(**stats)
