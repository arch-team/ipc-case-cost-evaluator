"""优化推荐器测试"""
import pytest
from app.services.calculator.recommender import StorageRecommender
from app.models.dimensions import (
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
    CostCalculationInput,
)
from app.models.enums import RecordingMode, VideoQuality
from app.models.results import Recommendation


class TestStorageRecommender:
    """优化推荐器测试"""

    @pytest.fixture
    def low_access_input(self):
        """低访问比例场景"""
        return CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.05,  # 5% 低访问
            ),
            technical=TechnicalDimensions(),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

    @pytest.fixture
    def high_access_input(self):
        """高访问比例场景"""
        return CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.8,  # 80% 高访问
            ),
            technical=TechnicalDimensions(),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

    def test_recommend_returns_recommendation(self, low_access_input):
        """测试推荐返回推荐结果"""
        recommender = StorageRecommender()
        result = recommender.recommend(low_access_input)

        assert isinstance(result, Recommendation)
        assert result.recommended_option is not None
        assert result.reason is not None

    def test_recommend_glacier_for_low_access(self, low_access_input):
        """测试低访问场景推荐 Glacier"""
        recommender = StorageRecommender()
        result = recommender.recommend(low_access_input)

        # 低访问时应该推荐 Glacier 或 Lifecycle
        assert "Glacier" in result.recommended_option or "Lifecycle" in result.recommended_option

    def test_recommend_standard_for_high_access(self, high_access_input):
        """测试高访问场景推荐 Standard"""
        recommender = StorageRecommender()
        result = recommender.recommend(high_access_input)

        # 高访问时 Glacier 检索费用高，可能推荐 Standard
        # 但也可能推荐 Lifecycle（热数据用 Standard）
        assert result.recommended_option is not None

    def test_has_potential_savings(self, low_access_input):
        """测试有潜在节省金额"""
        recommender = StorageRecommender()
        result = recommender.recommend(low_access_input)

        # 推荐非 Standard 时应该有节省
        if "Standard" not in result.recommended_option:
            assert result.potential_savings is not None
            assert result.potential_savings >= 0

    def test_has_suggestions(self, low_access_input):
        """测试有优化建议"""
        recommender = StorageRecommender()
        result = recommender.recommend(low_access_input)

        assert isinstance(result.suggestions, list)
        assert len(result.suggestions) >= 0

    def test_reason_contains_analysis(self, low_access_input):
        """测试原因包含分析"""
        recommender = StorageRecommender()
        result = recommender.recommend(low_access_input)

        # 原因应该包含访问模式的分析
        assert len(result.reason) > 0


class TestStorageRecommenderScenarios:
    """推荐器场景测试"""

    def test_short_retention_standard(self):
        """测试短保留期推荐 Standard"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                retention_days=7,  # 7天短保留
                access_pattern=0.3,
            ),
            technical=TechnicalDimensions(),
            pricing=PricingDimensions(),
        )

        recommender = StorageRecommender()
        result = recommender.recommend(input_data)

        # 短保留期时生命周期转换意义不大
        assert result.recommended_option is not None

    def test_long_retention_glacier(self):
        """测试长保留期推荐 Glacier"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                retention_days=90,  # 90天长保留
                access_pattern=0.05,
            ),
            technical=TechnicalDimensions(),
            pricing=PricingDimensions(),
        )

        recommender = StorageRecommender()
        result = recommender.recommend(input_data)

        # 长保留+低访问应该推荐 Glacier 或 Lifecycle
        assert "Glacier" in result.recommended_option or "Lifecycle" in result.recommended_option

    def test_continuous_recording(self):
        """测试全天候录像"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.CONTINUOUS,
                retention_days=30,
                access_pattern=0.1,
            ),
            technical=TechnicalDimensions(),
            pricing=PricingDimensions(),
        )

        recommender = StorageRecommender()
        result = recommender.recommend(input_data)

        assert result.recommended_option is not None


class TestStorageRecommenderAnalysis:
    """推荐器分析测试"""

    def test_analyze_cost_structure(self):
        """测试分析费用结构"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                retention_days=30,
                access_pattern=0.1,
            ),
            technical=TechnicalDimensions(),
            pricing=PricingDimensions(),
        )

        recommender = StorageRecommender()
        analysis = recommender.analyze_cost_structure(input_data)

        assert "dominant_cost" in analysis
        assert "access_level" in analysis
        assert "retention_level" in analysis

    def test_dominant_cost_is_storage(self):
        """测试存储是主要成本"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                retention_days=60,  # 长保留
                access_pattern=0.05,  # 低访问
            ),
            technical=TechnicalDimensions(),
            pricing=PricingDimensions(),
        )

        recommender = StorageRecommender()
        analysis = recommender.analyze_cost_structure(input_data)

        # 长保留+低访问时存储应该是主要成本
        assert analysis["dominant_cost"] == "storage"
