"""评估记录 API 路由"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.api.routes.auth import get_current_user
from app.db.repositories.evaluations import EvaluationRepository

router = APIRouter(prefix="/evaluations", tags=["评估记录"])


class CreateEvaluationRequest(BaseModel):
    """创建评估请求"""
    name: str = Field(..., min_length=1, description="评估名称")
    description: str = Field(default="", description="描述")
    input_data: Dict[str, Any] = Field(..., description="输入参数")
    result: Dict[str, Any] = Field(..., description="计算结果")


class UpdateEvaluationRequest(BaseModel):
    """更新评估请求"""
    name: Optional[str] = Field(default=None, min_length=1, description="评估名称")
    description: Optional[str] = Field(default=None, description="描述")


class EvaluationResponse(BaseModel):
    """评估响应"""
    id: str = Field(..., description="评估 ID")
    user_id: str = Field(..., description="用户 ID")
    name: str = Field(..., description="评估名称")
    description: str = Field(default="", description="描述")
    input_data: Dict[str, Any] = Field(..., description="输入参数")
    result: Dict[str, Any] = Field(..., description="计算结果")
    created_at: Optional[str] = Field(default=None, description="创建时间")
    updated_at: Optional[str] = Field(default=None, description="更新时间")


class EvaluationsListResponse(BaseModel):
    """评估列表响应"""
    evaluations: List[EvaluationResponse]


@router.post("", response_model=EvaluationResponse)
async def create_evaluation(
    request: CreateEvaluationRequest,
    current_user: dict = Depends(get_current_user),
) -> EvaluationResponse:
    """
    创建评估记录

    Args:
        request: 创建请求
        current_user: 当前用户

    Returns:
        评估记录
    """
    repo = EvaluationRepository()
    evaluation = repo.create(
        user_id=current_user["id"],
        name=request.name,
        description=request.description,
        input_data=request.input_data,
        result=request.result,
    )
    return EvaluationResponse(**evaluation)


@router.get("", response_model=EvaluationsListResponse)
async def list_evaluations(
    current_user: dict = Depends(get_current_user),
) -> EvaluationsListResponse:
    """
    列出当前用户的评估记录

    Returns:
        评估记录列表
    """
    repo = EvaluationRepository()
    evaluations = repo.list_by_user(current_user["id"])
    return EvaluationsListResponse(
        evaluations=[EvaluationResponse(**e) for e in evaluations]
    )


@router.get("/{eval_id}", response_model=EvaluationResponse)
async def get_evaluation(
    eval_id: str,
    current_user: dict = Depends(get_current_user),
) -> EvaluationResponse:
    """
    获取评估记录

    Args:
        eval_id: 评估 ID

    Returns:
        评估记录
    """
    repo = EvaluationRepository()
    evaluation = repo.get(eval_id)

    if not evaluation:
        raise HTTPException(status_code=404, detail="评估记录不存在")

    # 验证所有权
    if evaluation["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="无权访问此评估记录")

    return EvaluationResponse(**evaluation)


@router.put("/{eval_id}", response_model=EvaluationResponse)
async def update_evaluation(
    eval_id: str,
    request: UpdateEvaluationRequest,
    current_user: dict = Depends(get_current_user),
) -> EvaluationResponse:
    """
    更新评估记录

    Args:
        eval_id: 评估 ID
        request: 更新请求

    Returns:
        更新后的评估记录
    """
    repo = EvaluationRepository()
    evaluation = repo.get(eval_id)

    if not evaluation:
        raise HTTPException(status_code=404, detail="评估记录不存在")

    # 验证所有权
    if evaluation["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="无权修改此评估记录")

    updated = repo.update(
        eval_id,
        name=request.name,
        description=request.description,
    )
    return EvaluationResponse(**updated)


@router.delete("/{eval_id}")
async def delete_evaluation(
    eval_id: str,
    current_user: dict = Depends(get_current_user),
) -> Dict[str, str]:
    """
    删除评估记录

    Args:
        eval_id: 评估 ID

    Returns:
        删除结果
    """
    repo = EvaluationRepository()
    evaluation = repo.get(eval_id)

    if not evaluation:
        raise HTTPException(status_code=404, detail="评估记录不存在")

    # 验证所有权
    if evaluation["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="无权删除此评估记录")

    repo.delete(eval_id)
    return {"message": "删除成功"}
