"""认证 API 路由"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr

from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["认证"])
security = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    """注册请求"""
    email: EmailStr = Field(..., description="邮箱")
    password: str = Field(..., min_length=6, description="密码")
    name: str = Field(..., min_length=1, description="用户名")


class LoginRequest(BaseModel):
    """登录请求"""
    email: EmailStr = Field(..., description="邮箱")
    password: str = Field(..., description="密码")


class TokenResponse(BaseModel):
    """令牌响应"""
    access_token: str = Field(..., description="访问令牌")
    token_type: str = Field(default="bearer", description="令牌类型")


class UserResponse(BaseModel):
    """用户响应"""
    id: str = Field(..., description="用户 ID")
    email: str = Field(..., description="邮箱")
    name: str = Field(..., description="用户名")
    created_at: Optional[str] = Field(default=None, description="创建时间")


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """获取当前用户依赖"""
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

    return user


@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest) -> TokenResponse:
    """
    用户注册

    Args:
        request: 注册请求

    Returns:
        访问令牌
    """
    service = AuthService()

    try:
        user = service.register(request.email, request.password, request.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    token = service.create_access_token({"sub": user["id"]})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest) -> TokenResponse:
    """
    用户登录

    Args:
        request: 登录请求

    Returns:
        访问令牌
    """
    service = AuthService()
    user = service.authenticate(request.email, request.password)

    if not user:
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    token = service.create_access_token({"sub": user["id"]})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)) -> UserResponse:
    """
    获取当前用户信息

    Returns:
        当前用户信息
    """
    return UserResponse(**current_user)
