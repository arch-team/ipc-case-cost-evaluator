"""存储优化推荐器"""
from typing import Dict, List
from app.models.dimensions import CostCalculationInput
from app.models.results import Recommendation
from app.services.calculator.comparator import StorageComparator


class StorageRecommender:
    """
    存储优化推荐器

    基于对比结果和业务场景分析，生成存储策略推荐。
    """

    # 访问模式阈值
    LOW_ACCESS_THRESHOLD = 0.15  # 低于 15% 认为是低访问
    HIGH_ACCESS_THRESHOLD = 0.5  # 高于 50% 认为是高访问

    # 保留期阈值
    SHORT_RETENTION_DAYS = 14  # 少于 14 天认为是短保留
    LONG_RETENTION_DAYS = 60  # 超过 60 天认为是长保留

    def __init__(self):
        self.comparator = StorageComparator()

    def recommend(self, input_data: CostCalculationInput) -> Recommendation:
        """
        生成存储优化推荐

        Args:
            input_data: 三类维度输入

        Returns:
            优化推荐
        """
        # 执行方案对比
        comparison = self.comparator.compare(input_data)

        # 分析费用结构
        analysis = self.analyze_cost_structure(input_data)

        # 确定推荐方案
        best_option = comparison.best_option
        standard_option = comparison.get_by_name("S3 Standard")

        # 计算潜在节省
        potential_savings = None
        if standard_option and best_option.name != "S3 Standard":
            potential_savings = standard_option.monthly_cost - best_option.monthly_cost

        # 生成推荐原因
        reason = self._generate_reason(input_data, analysis, best_option.name)

        # 生成优化建议
        suggestions = self._generate_suggestions(input_data, analysis, comparison)

        return Recommendation(
            recommended_option=best_option.name,
            reason=reason,
            potential_savings=potential_savings,
            suggestions=suggestions,
        )

    def analyze_cost_structure(self, input_data: CostCalculationInput) -> Dict:
        """
        分析费用结构

        Args:
            input_data: 三类维度输入

        Returns:
            分析结果字典
        """
        functional = input_data.functional
        access_pattern = functional.access_pattern
        retention_days = functional.retention_days

        # 确定访问级别
        access_level = self._classify_access_level(access_pattern)

        # 确定保留期级别
        retention_level = self._classify_retention_level(retention_days)

        # 确定主要成本
        dominant_cost = self._determine_dominant_cost(access_level, retention_level)

        return {
            "access_level": access_level,
            "retention_level": retention_level,
            "dominant_cost": dominant_cost,
            "access_pattern": access_pattern,
            "retention_days": retention_days,
        }

    def _classify_access_level(self, access_pattern: float) -> str:
        """分类访问级别"""
        if access_pattern < self.LOW_ACCESS_THRESHOLD:
            return "low"
        if access_pattern > self.HIGH_ACCESS_THRESHOLD:
            return "high"
        return "medium"

    def _classify_retention_level(self, retention_days: int) -> str:
        """分类保留期级别"""
        if retention_days <= self.SHORT_RETENTION_DAYS:
            return "short"
        if retention_days >= self.LONG_RETENTION_DAYS:
            return "long"
        return "medium"

    def _determine_dominant_cost(self, access_level: str, retention_level: str) -> str:
        """确定主要成本类型"""
        # 长保留+低访问 → 存储为主
        if retention_level == "long" and access_level == "low":
            return "storage"
        # 短保留+高访问 → 请求/检索为主
        if retention_level == "short" and access_level == "high":
            return "requests"
        return "mixed"

    def _generate_reason(
        self, input_data: CostCalculationInput, analysis: Dict, recommended: str
    ) -> str:
        """生成推荐原因"""
        access_level = analysis["access_level"]
        retention_level = analysis["retention_level"]
        access_pattern = analysis["access_pattern"]
        retention_days = analysis["retention_days"]

        access_desc = {
            "low": f"低访问比例 ({access_pattern:.0%})",
            "medium": f"中等访问比例 ({access_pattern:.0%})",
            "high": f"高访问比例 ({access_pattern:.0%})",
        }

        retention_desc = {
            "short": f"短保留期 ({retention_days}天)",
            "medium": f"中等保留期 ({retention_days}天)",
            "long": f"长保留期 ({retention_days}天)",
        }

        access_info = access_desc[access_level]
        retention_info = retention_desc[retention_level]

        # 判断是否为 Glacier/Lifecycle 方案
        is_glacier_based = "Glacier" in recommended or "Lifecycle" in recommended

        # 构建推荐原因
        if is_glacier_based and access_level == "low":
            return (
                f"由于{access_info}和{retention_info}，"
                f"推荐使用 {recommended} 以降低存储成本。"
                f"Glacier 存储单价约为 Standard 的 1/5，适合低频访问数据。"
            )

        if is_glacier_based:
            return (
                f"基于{access_info}和{retention_info}的综合分析，"
                f"推荐使用 {recommended}。"
                f"虽然有检索费用，但存储节省仍能带来总体成本优化。"
            )

        if access_level == "high":
            return (
                f"由于{access_info}，推荐使用 {recommended}。"
                f"高访问频率场景下，Glacier 的检索费用会显著增加总成本。"
            )

        return (
            f"基于{access_info}和{retention_info}的综合分析，"
            f"推荐使用 {recommended}。"
        )

    def _generate_suggestions(
        self,
        input_data: CostCalculationInput,
        analysis: Dict,
        comparison,
    ) -> List[str]:
        """生成优化建议"""
        suggestions = []
        functional = input_data.functional

        # 基于访问模式的建议
        if analysis["access_level"] == "high":
            suggestions.append(
                "考虑是否可以减少视频回看频率，降低到 30% 以下可显著降低检索成本"
            )

        # 基于保留期的建议
        if analysis["retention_level"] == "long":
            suggestions.append(
                "长期保留的数据建议启用生命周期策略，热数据放 Standard，冷数据转 Glacier"
            )

        # 基于视频质量的建议
        if functional.video_quality.value in ["2K", "4K"]:
            suggestions.append(
                "高分辨率视频占用大量存储，考虑是否所有场景都需要 2K/4K 画质"
            )

        # 基于录像模式的建议
        if functional.recording_mode.value == "continuous":
            suggestions.append(
                "全天候录像产生大量数据，考虑是否可以改为事件触发模式以减少存储"
            )

        # 基于设备数量的建议
        if functional.device_count >= 10000:
            suggestions.append(
                "大规模部署建议与 AWS 洽谈批量折扣或使用预留容量"
            )

        # 对比结果相关建议
        best = comparison.best_option
        standard = comparison.get_by_name("S3 Standard")
        if standard and best.name != "S3 Standard":
            savings_percent = abs(best.vs_baseline)
            if savings_percent > 0.1:
                suggestions.append(
                    f"切换到 {best.name} 可节省约 {savings_percent:.0%} 的月度费用"
                )

        return suggestions
