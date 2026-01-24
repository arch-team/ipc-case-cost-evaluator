"""增强结果模型测试"""
import pytest
from datetime import datetime
from app.models.results import (
    TierDetail,
    CostItem,
    StageCostBreakdown,
    PricingMetadata,
    DetailedCostBreakdown,
)
from app.models.enums import StorageClass


class TestTierDetail:
    """阶梯定价明细测试"""

    def test_create_valid(self):
        """测试创建有效阶梯"""
        tier = TierDetail(
            tier_name="前 10TB",
            range_start_gb=0,
            range_end_gb=10240,
            unit_price=0.114,
            quantity_gb=500,
            amount=57.0,
        )
        assert tier.tier_name == "前 10TB"
        assert tier.amount == 57.0

    def test_unlimited_range(self):
        """测试无限范围"""
        tier = TierDetail(
            tier_name="超过 150TB",
            range_start_gb=153600,
            range_end_gb=None,
            unit_price=0.05,
            quantity_gb=1000,
            amount=50.0,
        )
        assert tier.range_end_gb is None


class TestCostItem:
    """费用项测试"""

    def test_create_simple(self):
        """测试创建简单费用项"""
        item = CostItem(
            name="S3 Standard 存储",
            unit_price=0.025,
            unit_price_unit="USD/GB-月",
            quantity=100,
            quantity_unit="GB",
            amount=2.5,
        )
        assert item.amount == 2.5

    def test_with_tiers(self):
        """测试带阶梯的费用项"""
        tiers = [
            TierDetail(
                tier_name="前 10TB",
                range_start_gb=0,
                range_end_gb=10240,
                unit_price=0.114,
                quantity_gb=500,
                amount=57.0,
            ),
        ]
        item = CostItem(
            name="数据传输",
            unit_price=0.114,
            unit_price_unit="USD/GB",
            quantity=500,
            quantity_unit="GB",
            amount=57.0,
            tiers=tiers,
        )
        assert item.tiers is not None
        assert len(item.tiers) == 1

    def test_has_tiers_property(self):
        """测试 has_tiers 属性"""
        item_no_tiers = CostItem(
            name="存储",
            unit_price=0.025,
            unit_price_unit="USD/GB",
            quantity=100,
            quantity_unit="GB",
            amount=2.5,
        )
        assert item_no_tiers.has_tiers is False

        item_with_tiers = CostItem(
            name="传输",
            unit_price=0.114,
            unit_price_unit="USD/GB",
            quantity=500,
            quantity_unit="GB",
            amount=57.0,
            tiers=[
                TierDetail(
                    tier_name="前 10TB",
                    range_start_gb=0,
                    range_end_gb=10240,
                    unit_price=0.114,
                    quantity_gb=500,
                    amount=57.0,
                ),
            ],
        )
        assert item_with_tiers.has_tiers is True


class TestStageCostBreakdown:
    """阶段费用明细测试"""

    def test_create_valid(self):
        """测试创建有效阶段明细"""
        storage_cost = CostItem(
            name="存储",
            unit_price=0.025,
            unit_price_unit="USD/GB-月",
            quantity=100,
            quantity_unit="GB",
            amount=10.0,
        )
        request_cost = CostItem(
            name="请求",
            unit_price=0.0047,
            unit_price_unit="USD/千次",
            quantity=1000,
            quantity_unit="千次",
            amount=5.0,
        )

        stage = StageCostBreakdown(
            start_day=1,
            end_day=7,
            storage_class=StorageClass.STANDARD,
            duration_days=7,
            storage_cost=storage_cost,
            request_cost=request_cost,
        )
        assert stage.start_day == 1
        assert stage.end_day == 7
        assert stage.storage_class == StorageClass.STANDARD

    def test_stage_total_property(self):
        """测试阶段总费用属性"""
        storage_cost = CostItem(
            name="存储",
            unit_price=0.025,
            unit_price_unit="USD/GB-月",
            quantity=100,
            quantity_unit="GB",
            amount=10.0,
        )
        request_cost = CostItem(
            name="请求",
            unit_price=0.0047,
            unit_price_unit="USD/千次",
            quantity=1000,
            quantity_unit="千次",
            amount=5.0,
        )

        stage = StageCostBreakdown(
            start_day=1,
            end_day=7,
            storage_class=StorageClass.STANDARD,
            duration_days=7,
            storage_cost=storage_cost,
            request_cost=request_cost,
        )
        assert stage.stage_total == 15.0


class TestPricingMetadata:
    """定价元数据测试"""

    def test_create_aws_api(self):
        """测试创建 AWS API 元数据"""
        metadata = PricingMetadata(
            source="AWS_API",
            updated_at=datetime.now(),
            region="ap-northeast-1",
            is_fallback=False,
        )
        assert metadata.source == "AWS_API"
        assert metadata.is_fallback is False

    def test_create_local_fallback(self):
        """测试创建本地回退元数据"""
        metadata = PricingMetadata(
            source="LOCAL_FALLBACK",
            updated_at=datetime.now(),
            region="us-east-1",
            is_fallback=True,
        )
        assert metadata.is_fallback is True


class TestDetailedCostBreakdown:
    """详细费用分解测试"""

    @pytest.fixture
    def sample_cost_item(self):
        """示例费用项"""
        return CostItem(
            name="存储",
            unit_price=0.025,
            unit_price_unit="USD/GB-月",
            quantity=100,
            quantity_unit="GB",
            amount=2.5,
        )

    @pytest.fixture
    def sample_transfer_item(self):
        """示例传输费用项"""
        return CostItem(
            name="数据传输",
            unit_price=0.114,
            unit_price_unit="USD/GB",
            quantity=500,
            quantity_unit="GB",
            amount=57.0,
            tiers=[
                TierDetail(
                    tier_name="前 10TB",
                    range_start_gb=0,
                    range_end_gb=10240,
                    unit_price=0.114,
                    quantity_gb=500,
                    amount=57.0,
                ),
            ],
        )

    def test_create_full(self, sample_cost_item, sample_transfer_item):
        """测试创建完整分解"""
        breakdown = DetailedCostBreakdown(
            storage_costs=[sample_cost_item],
            put_request_cost=sample_cost_item,
            get_request_cost=sample_cost_item,
            data_transfer_cost=sample_transfer_item,
        )
        assert breakdown.storage_costs is not None
        assert len(breakdown.storage_costs) == 1

    def test_total_storage_cost(self, sample_cost_item, sample_transfer_item):
        """测试总存储费用"""
        breakdown = DetailedCostBreakdown(
            storage_costs=[sample_cost_item, sample_cost_item],
            put_request_cost=sample_cost_item,
            get_request_cost=sample_cost_item,
            data_transfer_cost=sample_transfer_item,
        )
        assert breakdown.total_storage_cost == 5.0

    def test_total_property(self, sample_cost_item, sample_transfer_item):
        """测试总费用属性"""
        breakdown = DetailedCostBreakdown(
            storage_costs=[sample_cost_item],
            put_request_cost=sample_cost_item,
            get_request_cost=sample_cost_item,
            data_transfer_cost=sample_transfer_item,
        )
        # 2.5 (storage) + 2.5 (put) + 2.5 (get) + 57.0 (transfer) = 64.5
        assert breakdown.total == 64.5

    def test_with_stage_breakdowns(self, sample_cost_item, sample_transfer_item):
        """测试带阶段明细"""
        stage = StageCostBreakdown(
            start_day=1,
            end_day=7,
            storage_class=StorageClass.STANDARD,
            duration_days=7,
            storage_cost=sample_cost_item,
            request_cost=sample_cost_item,
        )

        breakdown = DetailedCostBreakdown(
            storage_costs=[sample_cost_item],
            put_request_cost=sample_cost_item,
            get_request_cost=sample_cost_item,
            data_transfer_cost=sample_transfer_item,
            stage_breakdowns=[stage],
        )
        assert breakdown.stage_breakdowns is not None
        assert len(breakdown.stage_breakdowns) == 1
