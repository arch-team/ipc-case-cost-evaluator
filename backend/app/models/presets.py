"""预设配置加载器

提供访问模式预设的加载和管理功能。
"""
import json
from pathlib import Path
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from app.models.dimensions import AccessPatternStage, AccessPatternConfig


class AccessPatternPreset(BaseModel):
    """访问模式预设

    定义一个预设的访问模式配置。

    Attributes:
        id: 预设 ID，用于标识和引用
        name: 预设名称，用于显示
        description: 预设描述
        is_default: 是否为默认预设
        stages: 预设的访问阶段列表
    """

    id: str = Field(..., description="预设 ID")
    name: str = Field(..., description="预设名称")
    description: str = Field(..., description="预设描述")
    is_default: bool = Field(default=False, description="是否为默认预设")
    stages: List[AccessPatternStage] = Field(..., description="预设的访问阶段列表")

    def to_config(self, retention_days: int) -> AccessPatternConfig:
        """转换为 AccessPatternConfig

        根据保留天数调整阶段配置，确保阶段覆盖整个保留期。

        Args:
            retention_days: 保留天数

        Returns:
            AccessPatternConfig 实例
        """
        adjusted_stages = []
        for stage in self.stages:
            if stage.start_day > retention_days:
                # 跳过超出保留期的阶段
                break

            adjusted_stage = AccessPatternStage(
                start_day=stage.start_day,
                end_day=min(stage.end_day, retention_days),
                access_rate=stage.access_rate,
            )
            adjusted_stages.append(adjusted_stage)

        # 确保有阶段
        if not adjusted_stages:
            adjusted_stages = [
                AccessPatternStage(
                    start_day=1,
                    end_day=retention_days,
                    access_rate=self.stages[0].access_rate if self.stages else 0.1,
                )
            ]

        return AccessPatternConfig(
            mode="time_decay",
            stages=adjusted_stages,
            decay_preset=self.id,
        )


class AccessPatternPresetsData(BaseModel):
    """访问模式预设数据

    包含所有预设和元数据。

    Attributes:
        presets: 预设列表
        metadata: 元数据信息
    """

    presets: List[AccessPatternPreset] = Field(..., description="预设列表")
    metadata: Dict = Field(default_factory=dict, description="元数据")


class AccessPatternPresetLoader:
    """访问模式预设加载器

    从 JSON 文件加载预设数据，支持缓存机制。
    """

    _cache: Optional[AccessPatternPresetsData] = None
    _presets_file: Path = Path(__file__).parent.parent / "data" / "access_patterns.json"

    @classmethod
    def load(cls) -> AccessPatternPresetsData:
        """加载预设数据

        首次加载时从 JSON 文件读取并缓存，
        后续请求直接返回缓存的数据。

        Returns:
            AccessPatternPresetsData 实例
        """
        if cls._cache is not None:
            return cls._cache

        if not cls._presets_file.exists():
            raise FileNotFoundError(f"预设配置文件不存在: {cls._presets_file}")

        with open(cls._presets_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        cls._cache = AccessPatternPresetsData(**data)
        return cls._cache

    @classmethod
    def get_preset(cls, preset_id: str) -> Optional[AccessPatternPreset]:
        """获取指定 ID 的预设

        Args:
            preset_id: 预设 ID

        Returns:
            AccessPatternPreset 实例，如果不存在则返回 None
        """
        data = cls.load()
        for preset in data.presets:
            if preset.id == preset_id:
                return preset
        return None

    @classmethod
    def get_default_preset(cls) -> Optional[AccessPatternPreset]:
        """获取默认预设

        Returns:
            默认的 AccessPatternPreset 实例，如果不存在则返回 None
        """
        data = cls.load()
        for preset in data.presets:
            if preset.is_default:
                return preset
        # 如果没有标记默认，返回第一个
        return data.presets[0] if data.presets else None

    @classmethod
    def list_presets(cls) -> List[AccessPatternPreset]:
        """获取所有预设列表

        Returns:
            所有预设的列表
        """
        data = cls.load()
        return data.presets

    @classmethod
    def clear_cache(cls) -> None:
        """清除缓存

        用于测试或重新加载配置时使用。
        """
        cls._cache = None
