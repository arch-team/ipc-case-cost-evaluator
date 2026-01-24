"""计算结果数据模型

定义成本计算的输出结果，包括费用明细、成本汇总、方案对比等模型。
"""
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, computed_field


class CostBreakdown(BaseModel):
    """费用明细

    存储各项费用的详细分解，支持计算总费用和各项占比。

    Attributes:
        storage_cost: 存储费用 (USD)
        put_request_cost: PUT 请求费用 (USD)
        get_request_cost: GET 请求费用 (USD)
        retrieval_cost: 数据检索费用 (USD)，主要用于 Glacier 类存储
        data_transfer_cost: 数据传输出站费用 (USD)
        lifecycle_cost: 生命周期转换费用 (USD)
    """

    storage_cost: float = Field(..., description="存储费用")
    put_request_cost: float = Field(..., description="PUT 请求费用")
    get_request_cost: float = Field(..., description="GET 请求费用")
    retrieval_cost: float = Field(default=0, description="检索费用")
    data_transfer_cost: float = Field(default=0, description="数据传输费用")
    lifecycle_cost: float = Field(default=0, description="生命周期转换费用")

    @computed_field
    @property
    def total(self) -> float:
        """计算总费用"""
        return (
            self.storage_cost
            + self.put_request_cost
            + self.get_request_cost
            + self.retrieval_cost
            + self.data_transfer_cost
            + self.lifecycle_cost
        )

    @property
    def percentages(self) -> Dict[str, float]:
        """计算各项费用占比

        Returns:
            各费用项占总费用的比例，总费用为零时所有比例返回 0
        """
        if self.total == 0:
            return {field: 0 for field in self._get_cost_fields()}

        return {
            field: getattr(self, field) / self.total
            for field in self._get_cost_fields()
        }

    def _get_cost_fields(self) -> List[str]:
        """获取所有成本字段名称"""
        return [
            "storage_cost",
            "put_request_cost",
            "get_request_cost",
            "retrieval_cost",
            "data_transfer_cost",
            "lifecycle_cost",
        ]


class IntermediateMetrics(BaseModel):
    """中间计算指标

    存储计算过程中的中间结果，用于调试和报告展示。

    Attributes:
        daily_data_gb: 每日数据量 (GB)
        avg_storage_gb: 平均存储量 (GB)，基于保留天数计算
        monthly_puts: 月度 PUT 请求数
        monthly_gets: 月度 GET 请求数
        monthly_retrieval_gb: 月度检索数据量 (GB)
        monthly_transfer_gb: 月度传输数据量 (GB)
    """

    daily_data_gb: float = Field(..., description="每日数据量 (GB)")
    avg_storage_gb: float = Field(..., description="平均存储量 (GB)")
    monthly_puts: float = Field(..., description="月度 PUT 请求数")
    monthly_gets: float = Field(..., description="月度 GET 请求数")
    monthly_retrieval_gb: float = Field(default=0, description="月度检索数据量 (GB)")
    monthly_transfer_gb: float = Field(default=0, description="月度传输数据量 (GB)")


class CostSummary(BaseModel):
    """成本计算汇总

    整合月度/年度成本、单设备成本及费用明细。

    Attributes:
        monthly_total: 月度总成本 (USD)
        per_device_monthly: 单设备月度成本 (USD)
        breakdown: 费用明细
        device_count: 设备数量
        metrics: 中间计算指标（可选）
    """

    monthly_total: float = Field(..., description="月度总成本")
    per_device_monthly: float = Field(..., description="单设备月度成本")
    breakdown: CostBreakdown = Field(..., description="费用明细")
    device_count: int = Field(..., description="设备数量")
    metrics: Optional[IntermediateMetrics] = Field(
        default=None, description="中间计算指标"
    )

    @computed_field
    @property
    def yearly_total(self) -> float:
        """年度总成本"""
        return self.monthly_total * 12

    @computed_field
    @property
    def per_device_yearly(self) -> float:
        """单设备年度成本"""
        return self.per_device_monthly * 12


class ComparisonItem(BaseModel):
    """方案对比项

    单个存储方案的成本对比信息。

    Attributes:
        name: 方案名称
        storage_class: 存储类型
        monthly_cost: 月度成本 (USD)
        yearly_cost: 年度成本 (USD)
        vs_baseline: 相对基准的差异比例（负值表示节省）
        breakdown: 费用明细（可选）
        is_recommended: 是否为推荐方案
    """

    name: str = Field(..., description="方案名称")
    storage_class: str = Field(..., description="存储类型")
    monthly_cost: float = Field(..., description="月度成本")
    yearly_cost: float = Field(..., description="年度成本")
    vs_baseline: float = Field(..., description="相对基准的差异比例")
    breakdown: Optional[CostBreakdown] = Field(default=None, description="费用明细")
    is_recommended: bool = Field(default=False, description="是否为推荐方案")

    @property
    def vs_baseline_percent(self) -> str:
        """格式化相对基准百分比

        Returns:
            格式化的百分比字符串，基准返回"基准"
        """
        if self.vs_baseline == 0:
            return "基准"
        sign = "+" if self.vs_baseline > 0 else ""
        return f"{sign}{self.vs_baseline:.1%}"


class Recommendation(BaseModel):
    """优化推荐

    基于成本分析的优化建议。

    Attributes:
        recommended_option: 推荐方案名称
        reason: 推荐理由
        potential_savings: 潜在节省金额 (USD)
        suggestions: 优化建议列表
    """

    recommended_option: str = Field(..., description="推荐方案")
    reason: str = Field(..., description="推荐理由")
    potential_savings: Optional[float] = Field(
        default=None, description="潜在节省金额"
    )
    suggestions: List[str] = Field(default_factory=list, description="优化建议")


class ComparisonResult(BaseModel):
    """方案对比结果

    多个存储方案的综合对比结果。

    Attributes:
        baseline: 基准方案名称
        items: 对比项列表
        recommendation: 优化推荐（可选）
    """

    baseline: str = Field(..., description="基准方案")
    items: List[ComparisonItem] = Field(..., description="对比项列表")
    recommendation: Optional[Recommendation] = Field(
        default=None, description="优化推荐"
    )

    @property
    def best_option(self) -> ComparisonItem:
        """获取成本最低的方案

        Returns:
            月度成本最低的对比项
        """
        return min(self.items, key=lambda x: x.monthly_cost)

    def get_by_name(self, name: str) -> Optional[ComparisonItem]:
        """按名称获取方案

        Args:
            name: 方案名称

        Returns:
            匹配的对比项，未找到返回 None
        """
        for item in self.items:
            if item.name == name:
                return item
        return None
