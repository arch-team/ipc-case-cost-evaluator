"""生命周期模板 API 路由"""
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.template_loader import TemplateLoader, LifecycleTemplate

router = APIRouter(prefix="/templates", tags=["模板"])


class TemplateStageResponse(BaseModel):
    """模板阶段响应"""

    start_day: int = Field(..., description="开始天数")
    end_day: int = Field(..., description="结束天数")
    storage_class: str = Field(..., description="存储类型")


class TemplateResponse(BaseModel):
    """模板响应"""

    id: str = Field(..., description="模板 ID")
    name: str = Field(..., description="模板名称")
    description: str = Field(..., description="模板描述")
    retention_days: int = Field(..., description="保留天数")
    stages: List[TemplateStageResponse] = Field(..., description="存储阶段列表")
    use_cases: List[str] = Field(..., description="适用场景")
    estimated_savings_vs_standard: float = Field(
        ..., description="相对纯 Standard 的预估节省比例"
    )
    stage_count: int = Field(..., description="阶段数量")


class TemplateListResponse(BaseModel):
    """模板列表响应"""

    templates: List[TemplateResponse]
    total: int = Field(..., description="模板总数")


class TemplateSummaryItem(BaseModel):
    """模板摘要项"""

    id: str
    name: str
    retention_days: int
    stage_count: int
    estimated_savings: str


class TemplateSummaryResponse(BaseModel):
    """模板摘要响应"""

    total_count: int
    templates: List[TemplateSummaryItem]
    metadata: Optional[dict] = None


def _convert_template(template: LifecycleTemplate) -> TemplateResponse:
    """转换模板对象为响应格式"""
    stages = [
        TemplateStageResponse(
            start_day=s.start_day,
            end_day=s.end_day,
            storage_class=s.storage_class,
        )
        for s in template.stages
    ]

    return TemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        retention_days=template.retention_days,
        stages=stages,
        use_cases=template.use_cases,
        estimated_savings_vs_standard=template.estimated_savings_vs_standard,
        stage_count=template.stage_count,
    )


@router.get("", response_model=TemplateListResponse)
async def list_templates() -> TemplateListResponse:
    """获取所有预设模板

    Returns:
        模板列表
    """
    templates = TemplateLoader.get_all()
    return TemplateListResponse(
        templates=[_convert_template(t) for t in templates],
        total=len(templates),
    )


@router.get("/summary", response_model=TemplateSummaryResponse)
async def get_templates_summary() -> TemplateSummaryResponse:
    """获取模板摘要信息

    Returns:
        模板摘要
    """
    summary = TemplateLoader.get_summary()
    return TemplateSummaryResponse(
        total_count=summary["total_count"],
        templates=[
            TemplateSummaryItem(**item) for item in summary["templates"]
        ],
        metadata=summary["metadata"],
    )


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: str) -> TemplateResponse:
    """获取指定模板详情

    Args:
        template_id: 模板 ID

    Returns:
        模板详情
    """
    template = TemplateLoader.get_by_id(template_id)
    if not template:
        raise HTTPException(
            status_code=404,
            detail=f"模板不存在: {template_id}",
        )
    return _convert_template(template)


@router.get("/filter/by-retention", response_model=TemplateListResponse)
async def filter_by_retention(
    min_days: int = 1,
    max_days: Optional[int] = None,
) -> TemplateListResponse:
    """按保留天数筛选模板

    Args:
        min_days: 最小保留天数
        max_days: 最大保留天数（可选）

    Returns:
        符合条件的模板列表
    """
    templates = TemplateLoader.get_by_retention_days(min_days, max_days)
    return TemplateListResponse(
        templates=[_convert_template(t) for t in templates],
        total=len(templates),
    )
