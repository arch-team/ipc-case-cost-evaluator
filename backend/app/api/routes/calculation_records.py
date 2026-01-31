"""核算记录 API 路由

提供核算记录相关的 API 端点：
- GET /defaults: 获取默认输入参数
- POST /calculate-detailed: 实时计算详细成本（无需登录）
- GET /calculation-records: 获取核算记录列表（需要登录）
- POST /calculation-records: 创建核算记录（需要登录）
- GET /calculation-records/{record_id}: 获取核算记录详情（需要登录）
- DELETE /calculation-records/{record_id}: 删除核算记录（需要登录）
"""
import html
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies import get_current_user
from app.models.dimensions import CostCalculationInput
from app.models.calculation_records import (
    CalculationRecord,
    CalculationRecordListResponse,
    CreateCalculationRecordRequest,
    DetailedCalculationResult,
)
from app.services.calculation_record_generator import (
    get_default_input,
    generate_detailed_result,
    generate_calculation_record,
)
from app.db.repositories.calculation_records import (
    CalculationRecordRepository,
    MAX_RECORDS_PER_USER,
)


router = APIRouter(tags=["核算记录"])


# ============================================================
# 公开端点（无需登录）
# ============================================================


@router.get(
    "/defaults",
    response_model=CostCalculationInput,
    summary="获取默认输入参数",
    description="返回典型场景的默认输入参数值，用于初始化计算表单",
)
def get_defaults():
    """获取默认输入参数"""
    return get_default_input()


@router.post(
    "/calculate-detailed",
    response_model=DetailedCalculationResult,
    summary="实时计算详细成本",
    description="根据输入参数计算详细成本信息，返回中间指标、分阶段费用明细和汇总。无需登录即可使用。",
)
def calculate_detailed(input_data: CostCalculationInput):
    """实时计算详细成本（无需登录）"""
    try:
        result = generate_detailed_result(input_data)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"计算失败: {str(e)}",
        )


# ============================================================
# 需要登录的端点
# ============================================================


@router.get(
    "/calculation-records",
    response_model=CalculationRecordListResponse,
    summary="获取核算记录列表",
    description="获取当前用户的核算记录列表，支持分页和搜索",
)
def list_records(
    page: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(default=None, description="按名称搜索"),
    sort_by: str = Query(
        default="created_at",
        pattern="^(created_at|name|total_cost)$",
        description="排序字段",
    ),
    sort_order: str = Query(
        default="desc",
        pattern="^(asc|desc)$",
        description="排序顺序",
    ),
    current_user: dict = Depends(get_current_user),
):
    """获取核算记录列表"""
    repo = CalculationRecordRepository()
    return repo.list_by_user(
        user_id=current_user["id"],
        page=page,
        page_size=page_size,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.post(
    "/calculation-records",
    response_model=CalculationRecord,
    status_code=status.HTTP_201_CREATED,
    summary="创建核算记录",
    description="保存当前计算结果为核算记录",
)
def create_record(
    request: CreateCalculationRecordRequest,
    input_data: CostCalculationInput,
    current_user: dict = Depends(get_current_user),
):
    """创建核算记录"""
    # XSS 防护：转义名称和描述
    name = html.escape(request.name.strip())
    description = html.escape(request.description.strip()) if request.description else ""

    try:
        # 生成核算记录
        record = generate_calculation_record(
            input_data=input_data,
            user_id=current_user["id"],
            name=name,
            description=description,
        )

        # 保存记录
        repo = CalculationRecordRepository()
        return repo.create(record)

    except ValueError as e:
        # 用户记录数量达到上限
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"保存失败: {str(e)}",
        )


@router.get(
    "/calculation-records/{record_id}",
    response_model=CalculationRecord,
    summary="获取核算记录详情",
    description="获取单条核算记录的完整信息",
)
def get_record(
    record_id: str,
    current_user: dict = Depends(get_current_user),
):
    """获取核算记录详情"""
    repo = CalculationRecordRepository()
    record = repo.get(user_id=current_user["id"], record_id=record_id)

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="记录不存在或无权访问",
        )

    return record


@router.delete(
    "/calculation-records/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除核算记录",
    description="删除指定的核算记录（硬删除，不可恢复）",
)
def delete_record(
    record_id: str,
    current_user: dict = Depends(get_current_user),
):
    """删除核算记录"""
    repo = CalculationRecordRepository()
    success = repo.delete(user_id=current_user["id"], record_id=record_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="记录不存在或无权访问",
        )


@router.get(
    "/calculation-records/count",
    summary="获取用户记录数量",
    description="获取当前用户的记录数量和上限信息",
)
def get_record_count(
    current_user: dict = Depends(get_current_user),
):
    """获取用户记录数量"""
    repo = CalculationRecordRepository()
    count = repo.count_by_user(current_user["id"])

    return {
        "count": count,
        "max_count": MAX_RECORDS_PER_USER,
        "can_create": count < MAX_RECORDS_PER_USER,
    }
