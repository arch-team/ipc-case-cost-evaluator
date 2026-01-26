"""认证 API 路由"""
from fastapi import APIRouter, HTTPException, Depends

from app.services.auth import AuthService
from app.models.user import (
    UserCreate,
    UserLogin,
    UserUpdate,
    UserResponse,
    TokenResponse,
)
from app.models.enums import UserRole
from app.api.dependencies import get_current_user, require_role

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/register", response_model=TokenResponse)
async def register(request: UserCreate) -> TokenResponse:
    """
    用户注册

    新用户注册，默认角色为 User。注册成功后自动登录并返回令牌。

    Args:
        request: 注册请求（邮箱、密码、用户名）

    Returns:
        访问令牌和用户信息

    Raises:
        400: 邮箱已注册或密码不符合要求
    """
    service = AuthService()

    try:
        user = service.register(request.email, request.password, request.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    token = service.create_access_token(user["id"], UserRole(user["role"]))
    return TokenResponse(
        access_token=token,
        user=UserResponse(**user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: UserLogin) -> TokenResponse:
    """
    用户登录

    使用邮箱和密码登录。连续登录失败 3 次将锁定账号 15 分钟。

    Args:
        request: 登录请求（邮箱、密码）

    Returns:
        访问令牌和用户信息

    Raises:
        401: 邮箱或密码错误
        403: 账号已锁定或已禁用
    """
    service = AuthService()

    try:
        user = service.authenticate(request.email, request.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    token = service.create_access_token(user["id"], UserRole(user["role"]))
    return TokenResponse(
        access_token=token,
        user=UserResponse(**user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)) -> UserResponse:
    """
    获取当前用户信息

    需要登录认证。

    Returns:
        当前用户信息
    """
    return UserResponse(**current_user)


@router.put("/update", response_model=UserResponse)
async def update_me(
    request: UserUpdate,
    current_user: dict = Depends(require_role(UserRole.USER)),
) -> UserResponse:
    """
    更新当前用户信息

    用户可以修改自己的名称和密码。

    Args:
        request: 更新请求（名称、密码）

    Returns:
        更新后的用户信息

    Raises:
        400: 密码不符合要求
        401: 未认证
    """
    service = AuthService()

    user = service.update_user(
        user_id=current_user["id"],
        name=request.name,
        password=request.password,
    )

    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    return UserResponse(**user)
