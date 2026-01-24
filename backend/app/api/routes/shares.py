"""分享 API 路由"""
from typing import List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, Depends

from app.api.routes.auth import get_current_user
from app.db.repositories.shares import ShareRepository
from app.db.repositories.evaluations import EvaluationRepository
from app.models.share import ShareCreate, ShareResponse, SharedEvaluation
from app.models.enums import SharePermission

router = APIRouter(tags=["分享"])


@router.post("/evaluations/{evaluation_id}/share", response_model=ShareResponse)
async def create_share(
    evaluation_id: str,
    data: ShareCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
) -> ShareResponse:
    """
    创建评估分享链接

    Args:
        evaluation_id: 评估 ID
        data: 分享创建请求
        request: HTTP 请求
        current_user: 当前用户

    Returns:
        分享响应
    """
    eval_repo = EvaluationRepository()
    share_repo = ShareRepository()

    # 验证评估存在
    evaluation = eval_repo.get(evaluation_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="评估不存在")

    # 验证所有权
    if evaluation.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="无权分享此评估")

    # 创建分享
    share = share_repo.create(
        user_id=current_user["id"],
        evaluation_id=evaluation_id,
        permission=data.permission,
        expires_days=data.expires_days
    )

    # 构建分享 URL
    base_url = str(request.base_url).rstrip("/")
    share_url = f"{base_url}/api/v1/shared/{share['share_token']}"

    return ShareResponse(
        share_token=share["share_token"],
        share_url=share_url,
        permission=data.permission,
        expires_at=datetime.fromisoformat(share["expires_at"]),
        created_at=datetime.fromisoformat(share["created_at"])
    )


@router.get("/shared/{token}", response_model=SharedEvaluation)
async def get_shared_evaluation(token: str) -> SharedEvaluation:
    """
    获取分享的评估内容 (公开接口，无需认证)

    Args:
        token: 分享令牌

    Returns:
        分享的评估内容
    """
    share_repo = ShareRepository()
    eval_repo = EvaluationRepository()

    share = share_repo.get_by_token(token)
    if not share:
        raise HTTPException(status_code=404, detail="分享不存在或已过期")

    evaluation = eval_repo.get(share["evaluation_id"])
    if not evaluation:
        raise HTTPException(status_code=404, detail="评估不存在")

    return SharedEvaluation(
        evaluation_id=evaluation["id"],
        name=evaluation["name"],
        description=evaluation.get("description", ""),
        input_data=evaluation["input_data"],
        result=evaluation["result"],
        permission=SharePermission(share["permission"]),
        created_at=datetime.fromisoformat(evaluation["created_at"])
    )


@router.delete("/evaluations/{evaluation_id}/share/{token}")
async def delete_share(
    evaluation_id: str,
    token: str,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    删除分享链接

    Args:
        evaluation_id: 评估 ID
        token: 分享令牌
        current_user: 当前用户

    Returns:
        删除结果
    """
    share_repo = ShareRepository()

    share = share_repo.get_by_token(token)
    if not share:
        raise HTTPException(status_code=404, detail="分享不存在")

    if share["evaluation_id"] != evaluation_id:
        raise HTTPException(status_code=400, detail="分享令牌与评估不匹配")

    # 验证所有权
    if share["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="无权删除此分享")

    share_repo.delete(token)
    return {"message": "分享已删除"}


class ShareListResponse:
    """分享列表响应"""
    shares: List[dict]


@router.get("/evaluations/{evaluation_id}/shares")
async def list_evaluation_shares(
    evaluation_id: str,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    列出评估的所有分享链接

    Args:
        evaluation_id: 评估 ID
        current_user: 当前用户

    Returns:
        分享列表
    """
    eval_repo = EvaluationRepository()
    share_repo = ShareRepository()

    # 验证评估存在
    evaluation = eval_repo.get(evaluation_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="评估不存在")

    # 验证所有权
    if evaluation.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="无权查看此评估的分享")

    shares = share_repo.list_by_evaluation(evaluation_id)
    return {"shares": shares}
