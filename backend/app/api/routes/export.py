"""Excel 导出 API 路由"""
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.models.dimensions import (
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
    CostCalculationInput,
)
from app.models.results import CostBreakdown, CostSummary, IntermediateMetrics, ComparisonResult
from app.services.excel_export import ExcelExporter

router = APIRouter(prefix="/export", tags=["导出"])


class ExportBreakdownRequest(BaseModel):
    """费用明细请求"""

    storage_cost: float = Field(..., description="存储费用")
    put_request_cost: float = Field(..., description="PUT 请求费用")
    get_request_cost: float = Field(..., description="GET 请求费用")
    retrieval_cost: float = Field(default=0.0, description="检索费用")
    data_transfer_cost: float = Field(default=0.0, description="传输费用")
    lifecycle_cost: float = Field(default=0.0, description="生命周期转换费用")
    total: float = Field(..., description="总费用")


class ExportMetricsRequest(BaseModel):
    """使用量指标请求"""

    monthly_storage_gb: float = Field(..., description="月度存储量 (GB)")
    monthly_puts: float = Field(..., description="月度 PUT 请求数")
    monthly_gets: float = Field(..., description="月度 GET 请求数")
    monthly_retrieval_gb: float = Field(default=0.0, description="月度检索量 (GB)")
    monthly_transfer_gb: float = Field(default=0.0, description="月度传输量 (GB)")


class ExportResultRequest(BaseModel):
    """计算结果请求"""

    monthly_total: float = Field(..., description="月度总费用")
    per_device_monthly: float = Field(..., description="单设备月均费用")
    breakdown: ExportBreakdownRequest = Field(..., description="费用明细")
    metrics: ExportMetricsRequest = Field(..., description="使用量指标")
    yearly_total: float = Field(..., description="年度总费用")
    per_device_yearly: float = Field(..., description="单设备年均费用")


class ExportInputRequest(BaseModel):
    """输入参数请求"""

    functional: FunctionalDimensions = Field(..., description="功能维度")
    technical: TechnicalDimensions = Field(
        default_factory=TechnicalDimensions, description="技术维度"
    )
    pricing: PricingDimensions = Field(
        default_factory=PricingDimensions, description="价格维度"
    )


class ExportRequest(BaseModel):
    """导出请求"""

    input_data: ExportInputRequest = Field(..., description="输入参数")
    result: ExportResultRequest = Field(..., description="计算结果")
    comparison: Optional[ComparisonResult] = Field(default=None, description="方案对比")
    title: str = Field(default="IPC 云存储成本评估报告", description="报告标题")


@router.post("")
async def export_excel(request: ExportRequest) -> Response:
    """
    导出 Excel 报告

    Args:
        request: 导出请求，包含输入参数、计算结果和可选的方案对比

    Returns:
        Excel 文件
    """
    # 转换为内部模型
    input_data = CostCalculationInput(
        functional=request.input_data.functional,
        technical=request.input_data.technical,
        pricing=request.input_data.pricing,
    )

    breakdown = CostBreakdown(
        storage_cost=request.result.breakdown.storage_cost,
        put_request_cost=request.result.breakdown.put_request_cost,
        get_request_cost=request.result.breakdown.get_request_cost,
        retrieval_cost=request.result.breakdown.retrieval_cost,
        data_transfer_cost=request.result.breakdown.data_transfer_cost,
        lifecycle_cost=request.result.breakdown.lifecycle_cost,
        total=request.result.breakdown.total,
    )

    metrics = IntermediateMetrics(
        daily_data_gb=request.result.metrics.monthly_storage_gb / 30,  # 近似转换
        avg_storage_gb=request.result.metrics.monthly_storage_gb,
        monthly_puts=request.result.metrics.monthly_puts,
        monthly_gets=request.result.metrics.monthly_gets,
        monthly_retrieval_gb=request.result.metrics.monthly_retrieval_gb,
        monthly_transfer_gb=request.result.metrics.monthly_transfer_gb,
    )

    result = CostSummary(
        monthly_total=request.result.monthly_total,
        per_device_monthly=request.result.per_device_monthly,
        breakdown=breakdown,
        device_count=request.input_data.functional.device_count,
        metrics=metrics,
    )

    # 生成 Excel
    exporter = ExcelExporter()
    content = exporter.generate(
        input_data=input_data,
        result=result,
        comparison=request.comparison,
        title=request.title,
    )

    # 生成文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"ipc_cost_evaluation_{timestamp}.xlsx"

    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
