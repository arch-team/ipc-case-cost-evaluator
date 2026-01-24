"""生命周期模板加载器

提供预设生命周期模板的加载、查询和验证功能。
"""
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from app.models.dimensions import LifecyclePolicy, LifecycleStage
from app.models.enums import StorageClass

logger = logging.getLogger(__name__)


class LifecycleTemplateStage(BaseModel):
    """模板阶段配置"""

    start_day: int = Field(..., ge=1, description="开始天数")
    end_day: int = Field(..., ge=1, description="结束天数")
    storage_class: str = Field(..., description="存储类型")


class LifecycleTemplate(BaseModel):
    """生命周期模板

    预设的生命周期配置模板，包含多个存储阶段。

    Attributes:
        id: 模板唯一标识
        name: 模板显示名称
        description: 模板描述
        retention_days: 保留天数
        stages: 存储阶段列表
        use_cases: 适用场景列表
        estimated_savings_vs_standard: 相对纯 Standard 的预估节省比例
    """

    id: str = Field(..., description="模板唯一标识")
    name: str = Field(..., description="模板显示名称")
    description: str = Field(..., description="模板描述")
    retention_days: int = Field(..., ge=1, description="保留天数")
    stages: List[LifecycleTemplateStage] = Field(..., description="存储阶段列表")
    use_cases: List[str] = Field(default_factory=list, description="适用场景列表")
    estimated_savings_vs_standard: float = Field(
        default=0,
        ge=0,
        le=1,
        description="相对纯 Standard 的预估节省比例",
    )

    def to_lifecycle_policy(self) -> LifecyclePolicy:
        """转换为 LifecyclePolicy 对象

        Returns:
            LifecyclePolicy: 可用于成本计算的生命周期策略
        """
        lifecycle_stages = [
            LifecycleStage(
                start_day=stage.start_day,
                end_day=stage.end_day,
                storage_class=StorageClass(stage.storage_class),
            )
            for stage in self.stages
        ]

        return LifecyclePolicy(
            enabled=True,
            stages=lifecycle_stages,
            template_id=self.id,
        )

    @property
    def storage_class_sequence(self) -> List[str]:
        """获取存储类型序列"""
        return [stage.storage_class for stage in self.stages]

    @property
    def stage_count(self) -> int:
        """获取阶段数量"""
        return len(self.stages)


class TemplateMetadata(BaseModel):
    """模板元数据"""

    version: str = Field(..., description="版本号")
    last_updated: str = Field(..., description="最后更新日期")
    description: str = Field(..., description="描述")


class TemplateLoader:
    """生命周期模板加载器

    从 JSON 文件加载预设模板，支持缓存和查询。

    Attributes:
        _templates: 模板字典缓存
        _metadata: 模板元数据
        _loaded: 是否已加载
    """

    _templates: Dict[str, LifecycleTemplate] = {}
    _metadata: Optional[TemplateMetadata] = None
    _loaded: bool = False
    _template_file: Path = Path(__file__).parent.parent / "data" / "lifecycle_templates.json"

    @classmethod
    def _ensure_loaded(cls) -> None:
        """确保模板已加载"""
        if not cls._loaded:
            cls._load_templates()

    @classmethod
    def _load_templates(cls) -> None:
        """从文件加载模板"""
        if not cls._template_file.exists():
            logger.warning(f"模板文件不存在: {cls._template_file}")
            cls._loaded = True
            return

        try:
            with open(cls._template_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            # 加载模板
            templates_data = data.get("templates", [])
            for template_data in templates_data:
                template = LifecycleTemplate(**template_data)
                cls._templates[template.id] = template

            # 加载元数据
            metadata_data = data.get("metadata")
            if metadata_data:
                cls._metadata = TemplateMetadata(**metadata_data)

            cls._loaded = True
            logger.info(f"成功加载 {len(cls._templates)} 个生命周期模板")

        except Exception as e:
            logger.error(f"加载模板文件失败: {e}")
            cls._loaded = True

    @classmethod
    def get_all(cls) -> List[LifecycleTemplate]:
        """获取所有模板

        Returns:
            模板列表
        """
        cls._ensure_loaded()
        return list(cls._templates.values())

    @classmethod
    def get_by_id(cls, template_id: str) -> Optional[LifecycleTemplate]:
        """根据 ID 获取模板

        Args:
            template_id: 模板 ID

        Returns:
            LifecycleTemplate 或 None
        """
        cls._ensure_loaded()
        return cls._templates.get(template_id)

    @classmethod
    def get_by_retention_days(
        cls,
        min_days: int,
        max_days: Optional[int] = None,
    ) -> List[LifecycleTemplate]:
        """根据保留天数范围获取模板

        Args:
            min_days: 最小保留天数
            max_days: 最大保留天数（可选）

        Returns:
            符合条件的模板列表
        """
        cls._ensure_loaded()
        result = []
        for template in cls._templates.values():
            if template.retention_days >= min_days:
                if max_days is None or template.retention_days <= max_days:
                    result.append(template)
        return sorted(result, key=lambda t: t.retention_days)

    @classmethod
    def get_template_ids(cls) -> List[str]:
        """获取所有模板 ID

        Returns:
            模板 ID 列表
        """
        cls._ensure_loaded()
        return list(cls._templates.keys())

    @classmethod
    def get_metadata(cls) -> Optional[TemplateMetadata]:
        """获取模板元数据

        Returns:
            TemplateMetadata 或 None
        """
        cls._ensure_loaded()
        return cls._metadata

    @classmethod
    def create_policy_from_template(
        cls,
        template_id: str,
        custom_retention_days: Optional[int] = None,
    ) -> Optional[LifecyclePolicy]:
        """从模板创建生命周期策略

        Args:
            template_id: 模板 ID
            custom_retention_days: 自定义保留天数（可选，会调整最后一个阶段）

        Returns:
            LifecyclePolicy 或 None（模板不存在时）
        """
        template = cls.get_by_id(template_id)
        if not template:
            return None

        policy = template.to_lifecycle_policy()

        # 如果指定了自定义保留天数，调整最后一个阶段
        if custom_retention_days and policy.stages:
            if custom_retention_days != template.retention_days:
                # 简单处理：调整最后一个阶段的结束天数
                last_stage = policy.stages[-1]
                if custom_retention_days >= last_stage.start_day:
                    policy.stages[-1] = LifecycleStage(
                        start_day=last_stage.start_day,
                        end_day=custom_retention_days,
                        storage_class=last_stage.storage_class,
                    )

        return policy

    @classmethod
    def validate_template_id(cls, template_id: str) -> bool:
        """验证模板 ID 是否有效

        Args:
            template_id: 模板 ID

        Returns:
            True 如果有效，False 否则
        """
        cls._ensure_loaded()
        return template_id in cls._templates

    @classmethod
    def clear_cache(cls) -> None:
        """清除缓存（用于测试）"""
        cls._templates.clear()
        cls._metadata = None
        cls._loaded = False

    @classmethod
    def get_summary(cls) -> Dict[str, any]:
        """获取模板摘要信息

        Returns:
            包含模板统计信息的字典
        """
        cls._ensure_loaded()
        templates = cls.get_all()

        return {
            "total_count": len(templates),
            "templates": [
                {
                    "id": t.id,
                    "name": t.name,
                    "retention_days": t.retention_days,
                    "stage_count": t.stage_count,
                    "estimated_savings": f"{t.estimated_savings_vs_standard:.0%}",
                }
                for t in templates
            ],
            "metadata": cls._metadata.model_dump() if cls._metadata else None,
        }
