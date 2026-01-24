"""分享模型定义

定义评估记录分享功能的数据模型。
"""
from datetime import datetime
from typing import Any, Dict
from pydantic import BaseModel, Field

from app.models.enums import SharePermission


class ShareCreate(BaseModel):
    """分享创建请求"""
    permission: SharePermission = Field(
        default=SharePermission.VIEW,
        description="分享权限: VIEW(仅查看) 或 DUPLICATE(可复制)"
    )
    expires_days: int = Field(
        default=7,
        ge=1,
        le=365,
        description="过期天数 (1-365)"
    )


class ShareResponse(BaseModel):
    """分享响应"""
    share_token: str = Field(..., description="分享令牌")
    share_url: str = Field(..., description="分享链接")
    permission: SharePermission
    expires_at: datetime = Field(..., description="过期时间")
    created_at: datetime = Field(..., description="创建时间")


class Share(BaseModel):
    """分享记录 (数据库模型)"""
    share_token: str = Field(..., description="分享令牌 (主键)")
    user_id: str = Field(..., description="创建者 ID")
    evaluation_id: str = Field(..., description="关联的评估 ID")
    permission: SharePermission
    expires_at: datetime
    created_at: datetime


class SharedEvaluation(BaseModel):
    """分享的评估内容 (公开访问返回)"""
    evaluation_id: str
    name: str
    description: str
    input_data: Dict[str, Any]
    result: Dict[str, Any]
    permission: SharePermission
    created_at: datetime
