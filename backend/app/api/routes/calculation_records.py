"""核算记录 API 路由

提供核算记录相关的 API 端点：
- GET /defaults: 获取默认输入参数
- POST /calculate-detailed: 实时计算详细成本（无需登录）
- GET /calculation-records: 获取核算记录列表（需要登录）
- POST /calculation-records: 创建核算记录（需要登录）
- GET /calculation-records/batch: 批量获取核算记录（需要登录，用于对比）
- GET /calculation-records/{record_id}: 获取核算记录详情（需要登录）
- DELETE /calculation-records/{record_id}: 删除核算记录（需要登录）
"""
import html
import logging
from typing import List, Optional

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

logger = logging.getLogger(__name__)

# 记录 JSON 大小限制（200KB）
MAX_RECORD_JSON_SIZE = 200 * 1024


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
    logger.info("获取默认输入参数")
    return get_default_input()


@router.post(
    "/calculate-detailed",
    response_model=DetailedCalculationResult,
    summary="实时计算详细成本",
    description="根据输入参数计算详细成本信息，返回中间指标、分阶段费用明细和汇总。无需登录即可使用。",
)
def calculate_detailed(input_data: CostCalculationInput):
    """实时计算详细成本（无需登录）"""
    logger.info(
        "实时计算详细成本: 设备数=%d, 录像模式=%s, 存储类型=%s",
        input_data.functional.device_count,
        input_data.functional.recording_mode.value,
        input_data.technical.storage_class.value,
    )
    try:
        result = generate_detailed_result(input_data)
        logger.info("计算成功: 总成本=$%.4f", result.summary.total_cost)
        return result
    except Exception as e:
        logger.error("计算失败: %s", str(e))
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
    logger.info(
        "获取核算记录列表: user_id=%s, page=%d, page_size=%d, search=%s",
        current_user["id"],
        page,
        page_size,
        search,
    )
    repo = CalculationRecordRepository()
    result = repo.list_by_user(
        user_id=current_user["id"],
        page=page,
        page_size=page_size,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    logger.info("返回 %d 条记录，共 %d 条", len(result.items), result.total)
    return result


@router.post(
    "/calculation-records",
    response_model=CalculationRecord,
    status_code=status.HTTP_201_CREATED,
    summary="创建核算记录",
    description="保存当前计算结果为核算记录",
)
def create_record(
    request: CreateCalculationRecordRequest,
    current_user: dict = Depends(get_current_user),
):
    """创建核算记录"""
    logger.info(
        "创建核算记录: user_id=%s, name=%s",
        current_user["id"],
        request.name,
    )

    # XSS 防护：转义名称和描述
    name = html.escape(request.name.strip())
    description = html.escape(request.description.strip()) if request.description else ""

    # 从请求中构建 CostCalculationInput
    input_data = CostCalculationInput(
        functional=request.functional,
        technical=request.technical,
        pricing=request.pricing,
    )

    try:
        # 生成核算记录
        record = generate_calculation_record(
            input_data=input_data,
            user_id=current_user["id"],
            name=name,
            description=description,
        )

        # 验证记录大小（防止过大的数据）
        record_json = record.model_dump_json()
        record_size = len(record_json.encode("utf-8"))
        if record_size > MAX_RECORD_JSON_SIZE:
            logger.warning(
                "记录大小超过限制: size=%d bytes, max=%d bytes",
                record_size,
                MAX_RECORD_JSON_SIZE,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"记录数据过大 ({record_size // 1024}KB)，请简化输入参数",
            )

        # 保存记录
        repo = CalculationRecordRepository()
        saved_record = repo.create(record)
        logger.info(
            "核算记录创建成功: record_id=%s, size=%d bytes",
            saved_record.record_id,
            record_size,
        )
        return saved_record

    except ValueError as e:
        # 用户记录数量达到上限
        logger.warning("创建记录失败（数量上限）: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("创建记录失败: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"保存失败: {str(e)}",
        )


@router.get(
    "/calculation-records/batch",
    response_model=List[CalculationRecord],
    summary="批量获取核算记录",
    description="根据记录 ID 列表批量获取完整记录，用于对比功能。支持 2-4 条记录。",
)
def get_records_batch(
    ids: str = Query(..., description="逗号分隔的记录 ID，2-4 个"),
    current_user: dict = Depends(get_current_user),
):
    """批量获取核算记录"""
    logger.info(
        "批量获取核算记录: user_id=%s, ids=%s",
        current_user["id"],
        ids,
    )

    # 解析并验证 ID 列表
    id_list = [id.strip() for id in ids.split(",") if id.strip()]

    if len(id_list) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请至少选择 2 条记录进行对比",
        )

    if len(id_list) > 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="最多支持 4 条记录对比",
        )

    # 检查重复 ID
    if len(id_list) != len(set(id_list)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="记录 ID 不能重复",
        )

    # 批量获取记录
    repo = CalculationRecordRepository()
    records = repo.get_batch(user_id=current_user["id"], record_ids=id_list)

    # 验证是否全部找到
    if len(records) != len(id_list):
        found_ids = {r.record_id for r in records}
        missing_ids = [id for id in id_list if id not in found_ids]
        logger.warning("部分记录不存在: missing=%s", missing_ids)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="部分记录不存在或无权访问",
        )

    logger.info("批量获取成功: count=%d", len(records))
    return records


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
    logger.info(
        "获取核算记录详情: user_id=%s, record_id=%s",
        current_user["id"],
        record_id,
    )
    repo = CalculationRecordRepository()
    record = repo.get(user_id=current_user["id"], record_id=record_id)

    if not record:
        logger.warning("记录不存在或无权访问: record_id=%s", record_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="记录不存在或无权访问",
        )

    logger.info("返回记录: record_id=%s, name=%s", record.record_id, record.name)
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
    logger.info(
        "删除核算记录: user_id=%s, record_id=%s",
        current_user["id"],
        record_id,
    )
    repo = CalculationRecordRepository()
    success = repo.delete(user_id=current_user["id"], record_id=record_id)

    if not success:
        logger.warning("删除失败（记录不存在或无权访问）: record_id=%s", record_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="记录不存在或无权访问",
        )

    logger.info("记录删除成功: record_id=%s", record_id)


@router.get(
    "/calculation-records/count",
    summary="获取用户记录数量",
    description="获取当前用户的记录数量和上限信息",
)
def get_record_count(
    current_user: dict = Depends(get_current_user),
):
    """获取用户记录数量"""
    logger.info("获取用户记录数量: user_id=%s", current_user["id"])
    repo = CalculationRecordRepository()
    count = repo.count_by_user(current_user["id"])

    logger.info("用户记录数量: count=%d, max=%d", count, MAX_RECORDS_PER_USER)
    return {
        "count": count,
        "max_count": MAX_RECORDS_PER_USER,
        "can_create": count < MAX_RECORDS_PER_USER,
    }
