"""用户相关 Pydantic 模型

定义用户注册、登录、更新等请求和响应模型。
遵循项目 Constitution 中 Pydantic 数据模型优先原则。
"""
import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from .enums import UserRole, UserStatus


class UserCreate(BaseModel):
    """用户注册请求模型"""
    email: EmailStr = Field(..., description="邮箱地址")
    password: str = Field(..., min_length=8, description="密码（最低8位，包含字母和数字）")
    name: str = Field(..., min_length=1, max_length=50, description="用户名")

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """验证密码强度：必须包含字母和数字"""
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('密码必须包含字母')
        if not re.search(r'[0-9]', v):
            raise ValueError('密码必须包含数字')
        return v


class UserLogin(BaseModel):
    """用户登录请求模型"""
    email: EmailStr = Field(..., description="邮箱地址")
    password: str = Field(..., description="密码")


class UserUpdate(BaseModel):
    """用户信息更新请求模型（用户自己更新）"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=50, description="用户名")
    password: Optional[str] = Field(default=None, min_length=8, description="新密码")

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: Optional[str]) -> Optional[str]:
        """验证密码强度：必须包含字母和数字"""
        if v is None:
            return v
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('密码必须包含字母')
        if not re.search(r'[0-9]', v):
            raise ValueError('密码必须包含数字')
        return v


class AdminUserUpdate(BaseModel):
    """管理员更新用户请求模型"""
    role: Optional[UserRole] = Field(default=None, description="用户角色")
    status: Optional[UserStatus] = Field(default=None, description="用户状态")


class UserResponse(BaseModel):
    """用户信息响应模型"""
    id: str = Field(..., description="用户 ID")
    email: str = Field(..., description="邮箱地址")
    name: str = Field(..., description="用户名")
    role: UserRole = Field(..., description="用户角色")
    status: UserStatus = Field(default=UserStatus.ACTIVE, description="用户状态")
    created_at: Optional[datetime] = Field(default=None, description="创建时间")


class TokenResponse(BaseModel):
    """令牌响应模型"""
    access_token: str = Field(..., description="JWT 访问令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
    user: UserResponse = Field(..., description="用户信息")


class UserListResponse(BaseModel):
    """用户列表响应模型"""
    users: list[UserResponse] = Field(..., description="用户列表")
    total: int = Field(..., description="总用户数")


class SystemStats(BaseModel):
    """系统统计信息响应模型"""
    total_users: int = Field(..., description="总用户数")
    active_users: int = Field(..., description="活跃用户数")
    disabled_users: int = Field(..., description="禁用用户数")
    admin_count: int = Field(..., description="管理员数量")
    total_evaluations: int = Field(..., description="总评估数")
    total_shares: int = Field(..., description="总分享数")


class MessageResponse(BaseModel):
    """通用消息响应模型"""
    message: str = Field(..., description="消息内容")
