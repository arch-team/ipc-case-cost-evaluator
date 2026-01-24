"""敏感度分析器"""
from typing import List, Optional
from app.models.dimensions import (
    CostCalculationInput,
    FunctionalDimensions,
    TechnicalDimensions,
)
from app.models.results import SensitivityAnalysis, SensitivityItem
from app.models.enums import StorageClass
from app.services.calculator.s3_standard import S3StandardCalculator
from app.services.calculator.s3_glacier import S3GlacierCalculator


class SensitivityAnalyzer:
    """
    敏感度分析器

    分析各参数变化对成本的影响程度。
    """

    # 默认变化幅度
    DEFAULT_DEVICE_VARIATIONS = [0.5, 1.5, 2.0]  # -50%, +50%, +100%
    DEFAULT_RETENTION_VARIATIONS = [0.5, 1.5, 2.0]  # -50%, +50%, +100%
    DEFAULT_ACCESS_VARIATIONS = [0.5, 2.0, 5.0]  # -50%, +100%, +400%

    def __init__(self):
        self.standard_calc = S3StandardCalculator()
        self.glacier_calc = S3GlacierCalculator()

    def analyze(
        self,
        input_data: CostCalculationInput,
        device_variations: Optional[List[float]] = None,
        retention_variations: Optional[List[float]] = None,
        access_variations: Optional[List[float]] = None,
    ) -> SensitivityAnalysis:
        """
        执行完整敏感度分析

        Args:
            input_data: 三类维度输入
            device_variations: 设备数量变化倍数列表
            retention_variations: 保留天数变化倍数列表
            access_variations: 访问比例变化倍数列表

        Returns:
            敏感度分析结果
        """
        device_variations = device_variations or self.DEFAULT_DEVICE_VARIATIONS
        retention_variations = retention_variations or self.DEFAULT_RETENTION_VARIATIONS
        access_variations = access_variations or self.DEFAULT_ACCESS_VARIATIONS

        # 计算基准成本
        base_cost = self._calculate_cost(input_data)

        items = []

        # 分析设备数量敏感度
        device_items = self._analyze_device_count(
            input_data, base_cost, device_variations
        )
        items.extend(device_items)

        # 分析保留天数敏感度
        retention_items = self._analyze_retention_days(
            input_data, base_cost, retention_variations
        )
        items.extend(retention_items)

        # 分析访问比例敏感度
        access_items = self._analyze_access_pattern(
            input_data, base_cost, access_variations
        )
        items.extend(access_items)

        return SensitivityAnalysis(
            base_monthly_cost=base_cost,
            items=items,
        )

    def analyze_parameter(
        self,
        input_data: CostCalculationInput,
        parameter: str,
        variations: List[float],
    ) -> SensitivityAnalysis:
        """
        分析单个参数的敏感度

        Args:
            input_data: 三类维度输入
            parameter: 参数名称
            variations: 变化倍数列表

        Returns:
            敏感度分析结果
        """
        base_cost = self._calculate_cost(input_data)

        if parameter == "device_count":
            items = self._analyze_device_count(input_data, base_cost, variations)
        elif parameter == "retention_days":
            items = self._analyze_retention_days(input_data, base_cost, variations)
        elif parameter == "access_pattern":
            items = self._analyze_access_pattern(input_data, base_cost, variations)
        else:
            items = []

        return SensitivityAnalysis(
            base_monthly_cost=base_cost,
            items=items,
        )

    def _calculate_cost(self, input_data: CostCalculationInput) -> float:
        """计算成本"""
        storage_class = input_data.technical.storage_class

        if storage_class == StorageClass.GLACIER_IR:
            result = self.glacier_calc.calculate(input_data)
        else:
            result = self.standard_calc.calculate(input_data)

        return result.monthly_total

    def _analyze_device_count(
        self,
        input_data: CostCalculationInput,
        base_cost: float,
        variations: List[float],
    ) -> List[SensitivityItem]:
        """分析设备数量敏感度"""
        items = []
        base_device_count = input_data.functional.device_count

        for variation in variations:
            new_device_count = max(1, int(base_device_count * variation))

            # 创建修改后的输入
            modified_functional = input_data.functional.model_copy(deep=True)
            modified_functional.device_count = new_device_count

            modified_input = CostCalculationInput(
                functional=modified_functional,
                technical=input_data.technical.model_copy(deep=True),
                pricing=input_data.pricing.model_copy(deep=True),
            )

            new_cost = self._calculate_cost(modified_input)
            cost_change = new_cost - base_cost
            cost_change_percent = cost_change / base_cost if base_cost > 0 else 0

            # 生成描述
            if variation < 1:
                change_desc = f"减少 {(1 - variation) * 100:.0f}% 至 {new_device_count} 台"
            else:
                change_desc = f"增加 {(variation - 1) * 100:.0f}% 至 {new_device_count} 台"

            items.append(
                SensitivityItem(
                    parameter="设备数量",
                    change_description=change_desc,
                    original_cost=base_cost,
                    new_cost=new_cost,
                    cost_change=cost_change,
                    cost_change_percent=cost_change_percent,
                )
            )

        return items

    def _analyze_retention_days(
        self,
        input_data: CostCalculationInput,
        base_cost: float,
        variations: List[float],
    ) -> List[SensitivityItem]:
        """分析保留天数敏感度"""
        items = []
        base_retention = input_data.functional.retention_days

        for variation in variations:
            new_retention = max(1, min(365, int(base_retention * variation)))

            # 创建修改后的输入
            modified_functional = input_data.functional.model_copy(deep=True)
            modified_functional.retention_days = new_retention

            modified_input = CostCalculationInput(
                functional=modified_functional,
                technical=input_data.technical.model_copy(deep=True),
                pricing=input_data.pricing.model_copy(deep=True),
            )

            new_cost = self._calculate_cost(modified_input)
            cost_change = new_cost - base_cost
            cost_change_percent = cost_change / base_cost if base_cost > 0 else 0

            # 生成描述
            if variation < 1:
                change_desc = f"缩短 {(1 - variation) * 100:.0f}% 至 {new_retention} 天"
            else:
                change_desc = f"延长 {(variation - 1) * 100:.0f}% 至 {new_retention} 天"

            items.append(
                SensitivityItem(
                    parameter="保留天数",
                    change_description=change_desc,
                    original_cost=base_cost,
                    new_cost=new_cost,
                    cost_change=cost_change,
                    cost_change_percent=cost_change_percent,
                )
            )

        return items

    def _analyze_access_pattern(
        self,
        input_data: CostCalculationInput,
        base_cost: float,
        variations: List[float],
    ) -> List[SensitivityItem]:
        """分析访问比例敏感度"""
        items = []
        base_access = input_data.functional.access_pattern

        for variation in variations:
            new_access = max(0.0, min(1.0, base_access * variation))

            # 创建修改后的输入
            modified_functional = input_data.functional.model_copy(deep=True)
            modified_functional.access_pattern = new_access

            modified_input = CostCalculationInput(
                functional=modified_functional,
                technical=input_data.technical.model_copy(deep=True),
                pricing=input_data.pricing.model_copy(deep=True),
            )

            new_cost = self._calculate_cost(modified_input)
            cost_change = new_cost - base_cost
            cost_change_percent = cost_change / base_cost if base_cost > 0 else 0

            # 生成描述
            if variation < 1:
                change_desc = f"降低回看比例至 {new_access:.0%}"
            else:
                change_desc = f"增加回看比例至 {new_access:.0%}"

            items.append(
                SensitivityItem(
                    parameter="回看比例",
                    change_description=change_desc,
                    original_cost=base_cost,
                    new_cost=new_cost,
                    cost_change=cost_change,
                    cost_change_percent=cost_change_percent,
                )
            )

        return items
