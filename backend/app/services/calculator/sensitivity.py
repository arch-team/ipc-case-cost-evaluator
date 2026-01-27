"""敏感度分析器"""
from typing import Callable, List, Optional, Tuple
from app.models.dimensions import (
    CostCalculationInput,
    FunctionalDimensions,
)
from app.models.results import SensitivityAnalysis, SensitivityItem
from app.models.enums import StorageClass
from app.services.calculator.s3_standard import S3StandardCalculator
from app.services.calculator.s3_glacier import S3GlacierCalculator


# 参数配置类型：(字段名, 最小值, 最大值, 显示名称, 变化描述函数)
ParameterConfig = Tuple[
    str,  # 字段名
    float,  # 最小值
    float,  # 最大值
    str,  # 显示名称
    Callable[[float, float], str],  # 变化描述函数
]


class SensitivityAnalyzer:
    """
    敏感度分析器

    分析各参数变化对成本的影响程度。
    使用模板方法模式简化重复的分析逻辑。
    """

    # 默认变化幅度
    DEFAULT_DEVICE_VARIATIONS = [0.5, 1.5, 2.0]  # -50%, +50%, +100%
    DEFAULT_RETENTION_VARIATIONS = [0.5, 1.5, 2.0]  # -50%, +50%, +100%
    DEFAULT_ACCESS_VARIATIONS = [0.5, 2.0, 5.0]  # -50%, +100%, +400%

    # 参数配置：统一管理各参数的约束和描述
    PARAMETER_CONFIGS: dict[str, ParameterConfig] = {
        "device_count": (
            "device_count",
            1,
            10_000_000,  # 最大设备数量上限
            "设备数量",
            lambda base, new: (
                f"减少 {(1 - new/base) * 100:.0f}% 至 {int(new)} 台"
                if new < base
                else f"增加 {(new/base - 1) * 100:.0f}% 至 {int(new)} 台"
            ),
        ),
        "retention_days": (
            "retention_days",
            1,
            365,
            "保留天数",
            lambda base, new: (
                f"缩短 {(1 - new/base) * 100:.0f}% 至 {int(new)} 天"
                if new < base
                else f"延长 {(new/base - 1) * 100:.0f}% 至 {int(new)} 天"
            ),
        ),
        "access_pattern": (
            "access_pattern",
            0.0,
            1.0,
            "回看比例",
            lambda base, new: (
                f"降低回看比例至 {new:.0%}"
                if new < base
                else f"增加回看比例至 {new:.0%}"
            ),
        ),
    }

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

    def _analyze_parameter(
        self,
        input_data: CostCalculationInput,
        base_cost: float,
        variations: List[float],
        param_name: str,
    ) -> List[SensitivityItem]:
        """通用参数敏感度分析（模板方法）

        使用模板方法模式消除三个分析方法的重复代码。

        Args:
            input_data: 原始输入数据
            base_cost: 基准成本
            variations: 变化倍数列表
            param_name: 参数名称（device_count, retention_days, access_pattern）

        Returns:
            敏感度分析项列表
        """
        config = self.PARAMETER_CONFIGS.get(param_name)
        if not config:
            return []

        field_name, min_val, max_val, display_name, desc_func = config
        base_value = getattr(input_data.functional, field_name)

        items = []
        for variation in variations:
            # 计算新值并约束在有效范围内
            new_value = base_value * variation
            if field_name in ("device_count", "retention_days"):
                new_value = max(int(min_val), min(int(max_val), int(new_value)))
            else:
                new_value = max(min_val, min(max_val, new_value))

            # 创建修改后的输入
            modified_functional = input_data.functional.model_copy(deep=True)
            setattr(modified_functional, field_name, new_value)

            modified_input = CostCalculationInput(
                functional=modified_functional,
                technical=input_data.technical.model_copy(deep=True),
                pricing=input_data.pricing.model_copy(deep=True),
            )

            new_cost = self._calculate_cost(modified_input)
            cost_change = new_cost - base_cost
            cost_change_percent = cost_change / base_cost if base_cost > 0 else 0

            items.append(
                SensitivityItem(
                    parameter=display_name,
                    change_description=desc_func(base_value, new_value),
                    original_cost=base_cost,
                    new_cost=new_cost,
                    cost_change=cost_change,
                    cost_change_percent=cost_change_percent,
                )
            )

        return items

    def _analyze_device_count(
        self,
        input_data: CostCalculationInput,
        base_cost: float,
        variations: List[float],
    ) -> List[SensitivityItem]:
        """分析设备数量敏感度"""
        return self._analyze_parameter(input_data, base_cost, variations, "device_count")

    def _analyze_retention_days(
        self,
        input_data: CostCalculationInput,
        base_cost: float,
        variations: List[float],
    ) -> List[SensitivityItem]:
        """分析保留天数敏感度"""
        return self._analyze_parameter(input_data, base_cost, variations, "retention_days")

    def _analyze_access_pattern(
        self,
        input_data: CostCalculationInput,
        base_cost: float,
        variations: List[float],
    ) -> List[SensitivityItem]:
        """分析访问比例敏感度"""
        return self._analyze_parameter(input_data, base_cost, variations, "access_pattern")
