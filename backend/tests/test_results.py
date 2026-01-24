"""计算结果模型测试"""
import pytest
from app.models.results import (
    CostBreakdown,
    CostSummary,
    ComparisonItem,
    ComparisonResult,
    Recommendation,
    IntermediateMetrics,
)


class TestCostBreakdown:
    """费用明细模型测试"""

    def test_total_calculation(self):
        """测试总费用计算"""
        breakdown = CostBreakdown(
            storage_cost=100.0,
            put_request_cost=20.0,
            get_request_cost=5.0,
            retrieval_cost=10.0,
            data_transfer_cost=15.0,
            lifecycle_cost=0.0,
        )
        assert breakdown.total == 150.0

    def test_percentage_calculation(self):
        """测试百分比计算"""
        breakdown = CostBreakdown(
            storage_cost=80.0,
            put_request_cost=20.0,
            get_request_cost=0.0,
            retrieval_cost=0.0,
            data_transfer_cost=0.0,
            lifecycle_cost=0.0,
        )
        percentages = breakdown.percentages
        assert percentages["storage_cost"] == pytest.approx(0.8, rel=0.01)
        assert percentages["put_request_cost"] == pytest.approx(0.2, rel=0.01)

    def test_zero_total_percentages(self):
        """测试零总费用时的百分比"""
        breakdown = CostBreakdown(
            storage_cost=0,
            put_request_cost=0,
            get_request_cost=0,
            retrieval_cost=0,
            data_transfer_cost=0,
            lifecycle_cost=0,
        )
        percentages = breakdown.percentages
        assert all(v == 0 for v in percentages.values())

    def test_default_values(self):
        """测试默认值"""
        breakdown = CostBreakdown(
            storage_cost=100.0,
            put_request_cost=20.0,
            get_request_cost=5.0,
        )
        assert breakdown.retrieval_cost == 0
        assert breakdown.data_transfer_cost == 0
        assert breakdown.lifecycle_cost == 0
        assert breakdown.total == 125.0


class TestIntermediateMetrics:
    """中间计算指标测试"""

    def test_create_metrics(self):
        """测试创建中间指标"""
        metrics = IntermediateMetrics(
            daily_data_gb=10.0,
            avg_storage_gb=300.0,
            monthly_puts=90000,
            monthly_gets=1000,
            monthly_retrieval_gb=50.0,
            monthly_transfer_gb=100.0,
        )
        assert metrics.daily_data_gb == 10.0
        assert metrics.avg_storage_gb == 300.0
        assert metrics.monthly_puts == 90000
        assert metrics.monthly_gets == 1000

    def test_default_values(self):
        """测试默认值"""
        metrics = IntermediateMetrics(
            daily_data_gb=10.0,
            avg_storage_gb=300.0,
            monthly_puts=90000,
            monthly_gets=1000,
        )
        assert metrics.monthly_retrieval_gb == 0
        assert metrics.monthly_transfer_gb == 0


class TestCostSummary:
    """成本汇总测试"""

    def test_create_summary(self):
        """测试创建成本汇总"""
        breakdown = CostBreakdown(
            storage_cost=100.0,
            put_request_cost=20.0,
            get_request_cost=5.0,
            retrieval_cost=0.0,
            data_transfer_cost=15.0,
            lifecycle_cost=0.0,
        )
        summary = CostSummary(
            monthly_total=140.0,
            per_device_monthly=0.14,
            breakdown=breakdown,
            device_count=1000,
        )
        assert summary.yearly_total == pytest.approx(1680.0, rel=0.01)
        assert summary.per_device_yearly == pytest.approx(1.68, rel=0.01)

    def test_with_metrics(self):
        """测试带中间指标的汇总"""
        breakdown = CostBreakdown(
            storage_cost=100.0,
            put_request_cost=20.0,
            get_request_cost=5.0,
        )
        metrics = IntermediateMetrics(
            daily_data_gb=10.0,
            avg_storage_gb=300.0,
            monthly_puts=90000,
            monthly_gets=1000,
        )
        summary = CostSummary(
            monthly_total=125.0,
            per_device_monthly=0.125,
            breakdown=breakdown,
            device_count=1000,
            metrics=metrics,
        )
        assert summary.metrics is not None
        assert summary.metrics.daily_data_gb == 10.0


class TestComparisonItem:
    """方案对比项测试"""

    def test_vs_baseline_percent(self):
        """测试相对基准百分比 - 正值"""
        item = ComparisonItem(
            name="Test",
            storage_class="STANDARD",
            monthly_cost=100,
            yearly_cost=1200,
            vs_baseline=0.15,
        )
        assert item.vs_baseline_percent == "+15.0%"

    def test_vs_baseline_percent_negative(self):
        """测试相对基准百分比 - 负值"""
        item = ComparisonItem(
            name="Test",
            storage_class="STANDARD",
            monthly_cost=100,
            yearly_cost=1200,
            vs_baseline=-0.10,
        )
        assert item.vs_baseline_percent == "-10.0%"

    def test_vs_baseline_percent_zero(self):
        """测试相对基准百分比 - 零值（基准）"""
        item = ComparisonItem(
            name="Test",
            storage_class="STANDARD",
            monthly_cost=100,
            yearly_cost=1200,
            vs_baseline=0.0,
        )
        assert item.vs_baseline_percent == "基准"

    def test_default_values(self):
        """测试默认值"""
        item = ComparisonItem(
            name="Test",
            storage_class="STANDARD",
            monthly_cost=100,
            yearly_cost=1200,
            vs_baseline=0.0,
        )
        assert item.breakdown is None
        assert item.is_recommended is False


class TestRecommendation:
    """优化推荐测试"""

    def test_create_recommendation(self):
        """测试创建推荐"""
        rec = Recommendation(
            recommended_option="Glacier IR",
            reason="成本更低，适合长期存储",
            potential_savings=1000.0,
            suggestions=["考虑使用生命周期策略", "优化数据传输"],
        )
        assert rec.recommended_option == "Glacier IR"
        assert rec.potential_savings == 1000.0
        assert len(rec.suggestions) == 2

    def test_default_values(self):
        """测试默认值"""
        rec = Recommendation(
            recommended_option="S3 Standard",
            reason="访问频繁，标准存储更合适",
        )
        assert rec.potential_savings is None
        assert rec.suggestions == []


class TestComparisonResult:
    """方案对比结果测试"""

    def test_find_best_option(self):
        """测试查找最优方案"""
        items = [
            ComparisonItem(
                name="S3 Standard",
                storage_class="STANDARD",
                monthly_cost=100.0,
                yearly_cost=1200.0,
                vs_baseline=0.0,
            ),
            ComparisonItem(
                name="Glacier IR",
                storage_class="GLACIER_IR",
                monthly_cost=80.0,
                yearly_cost=960.0,
                vs_baseline=-0.2,
            ),
        ]
        result = ComparisonResult(baseline="S3 Standard", items=items)
        assert result.best_option.name == "Glacier IR"

    def test_get_by_name(self):
        """测试按名称获取方案"""
        items = [
            ComparisonItem(
                name="S3 Standard",
                storage_class="STANDARD",
                monthly_cost=100.0,
                yearly_cost=1200.0,
                vs_baseline=0.0,
            ),
            ComparisonItem(
                name="Glacier IR",
                storage_class="GLACIER_IR",
                monthly_cost=80.0,
                yearly_cost=960.0,
                vs_baseline=-0.2,
            ),
        ]
        result = ComparisonResult(baseline="S3 Standard", items=items)

        standard = result.get_by_name("S3 Standard")
        assert standard is not None
        assert standard.monthly_cost == 100.0

        glacier = result.get_by_name("Glacier IR")
        assert glacier is not None
        assert glacier.monthly_cost == 80.0

        not_found = result.get_by_name("Not Exist")
        assert not_found is None

    def test_with_recommendation(self):
        """测试带推荐的对比结果"""
        items = [
            ComparisonItem(
                name="S3 Standard",
                storage_class="STANDARD",
                monthly_cost=100.0,
                yearly_cost=1200.0,
                vs_baseline=0.0,
            ),
        ]
        rec = Recommendation(
            recommended_option="S3 Standard",
            reason="访问频繁",
        )
        result = ComparisonResult(
            baseline="S3 Standard",
            items=items,
            recommendation=rec,
        )
        assert result.recommendation is not None
        assert result.recommendation.recommended_option == "S3 Standard"
