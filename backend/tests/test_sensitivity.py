"""敏感度分析器测试"""
import pytest
from app.services.calculator.sensitivity import SensitivityAnalyzer
from app.models.dimensions import (
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
    CostCalculationInput,
)
from app.models.enums import RecordingMode, VideoQuality, StorageClass
from app.models.results import SensitivityAnalysis, SensitivityItem


class TestSensitivityAnalyzer:
    """敏感度分析器测试"""

    @pytest.fixture
    def sample_input(self):
        """示例输入"""
        return CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
            ),
            pricing=PricingDimensions(
                region="ap-northeast-1",
                discount_percent=0.0,
            ),
        )

    def test_analyze_returns_sensitivity_analysis(self, sample_input):
        """测试分析返回敏感度分析结果"""
        analyzer = SensitivityAnalyzer()
        result = analyzer.analyze(sample_input)

        assert isinstance(result, SensitivityAnalysis)
        assert result.base_monthly_cost > 0
        assert len(result.items) > 0

    def test_includes_device_count_sensitivity(self, sample_input):
        """测试包含设备数量敏感度"""
        analyzer = SensitivityAnalyzer()
        result = analyzer.analyze(sample_input)

        device_items = [i for i in result.items if "设备" in i.parameter]
        assert len(device_items) > 0

    def test_includes_retention_sensitivity(self, sample_input):
        """测试包含保留天数敏感度"""
        analyzer = SensitivityAnalyzer()
        result = analyzer.analyze(sample_input)

        retention_items = [i for i in result.items if "保留" in i.parameter]
        assert len(retention_items) > 0

    def test_includes_access_pattern_sensitivity(self, sample_input):
        """测试包含访问比例敏感度"""
        analyzer = SensitivityAnalyzer()
        result = analyzer.analyze(sample_input)

        access_items = [i for i in result.items if "访问" in i.parameter or "回看" in i.parameter]
        assert len(access_items) > 0

    def test_sensitivity_item_has_all_fields(self, sample_input):
        """测试敏感度项包含所有字段"""
        analyzer = SensitivityAnalyzer()
        result = analyzer.analyze(sample_input)

        for item in result.items:
            assert item.parameter is not None
            assert item.change_description is not None
            assert item.original_cost > 0
            assert item.new_cost > 0
            assert item.cost_change is not None
            assert item.cost_change_percent is not None

    def test_cost_change_calculation(self, sample_input):
        """测试费用变化计算"""
        analyzer = SensitivityAnalyzer()
        result = analyzer.analyze(sample_input)

        for item in result.items:
            expected_change = item.new_cost - item.original_cost
            assert item.cost_change == pytest.approx(expected_change, rel=0.01)

    def test_cost_change_percent_calculation(self, sample_input):
        """测试费用变化百分比计算"""
        analyzer = SensitivityAnalyzer()
        result = analyzer.analyze(sample_input)

        for item in result.items:
            if item.original_cost > 0:
                expected_percent = (item.new_cost - item.original_cost) / item.original_cost
                assert item.cost_change_percent == pytest.approx(expected_percent, rel=0.01)

    def test_device_count_increase_increases_cost(self, sample_input):
        """测试设备数量增加导致费用增加"""
        analyzer = SensitivityAnalyzer()
        result = analyzer.analyze(sample_input)

        # 找到设备数量增加的敏感度项
        device_increase = None
        for item in result.items:
            if "设备" in item.parameter and "增加" in item.change_description:
                device_increase = item
                break

        if device_increase:
            assert device_increase.cost_change > 0

    def test_retention_increase_increases_cost(self, sample_input):
        """测试保留天数增加导致费用增加"""
        analyzer = SensitivityAnalyzer()
        result = analyzer.analyze(sample_input)

        # 找到保留天数增加的敏感度项
        retention_increase = None
        for item in result.items:
            if "保留" in item.parameter and ("增加" in item.change_description or "延长" in item.change_description):
                retention_increase = item
                break

        if retention_increase:
            assert retention_increase.cost_change > 0


class TestSensitivityAnalyzerCustom:
    """敏感度分析器自定义测试"""

    def test_custom_variations(self):
        """测试自定义变化幅度"""
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

        analyzer = SensitivityAnalyzer()
        result = analyzer.analyze(
            input_data,
            device_variations=[0.5, 2.0],  # -50%, +100%
            retention_variations=[0.5, 2.0],
        )

        assert len(result.items) > 0

    def test_single_parameter_analysis(self):
        """测试单参数分析"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                retention_days=30,
            ),
            technical=TechnicalDimensions(),
            pricing=PricingDimensions(),
        )

        analyzer = SensitivityAnalyzer()
        result = analyzer.analyze_parameter(
            input_data,
            parameter="device_count",
            variations=[0.5, 1.5, 2.0],
        )

        assert len(result.items) == 3


class TestSensitivityAnalyzerEdgeCases:
    """敏感度分析器边界测试"""

    def test_single_device(self):
        """测试单设备场景"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
            ),
            technical=TechnicalDimensions(),
            pricing=PricingDimensions(),
        )

        analyzer = SensitivityAnalyzer()
        result = analyzer.analyze(input_data)

        assert result.base_monthly_cost > 0

    def test_glacier_storage_class(self):
        """测试 Glacier 存储类型"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.GLACIER_IR,
            ),
            pricing=PricingDimensions(),
        )

        analyzer = SensitivityAnalyzer()
        result = analyzer.analyze(input_data)

        assert result.base_monthly_cost > 0
        assert len(result.items) > 0
