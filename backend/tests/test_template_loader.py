"""生命周期模板加载器测试"""
import pytest
from app.services.template_loader import TemplateLoader, LifecycleTemplate
from app.models.dimensions import LifecyclePolicy


class TestTemplateLoader:
    """模板加载器测试"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """每个测试前清除缓存"""
        TemplateLoader.clear_cache()
        yield
        TemplateLoader.clear_cache()

    def test_get_all_returns_list(self):
        """测试获取所有模板返回列表"""
        templates = TemplateLoader.get_all()
        assert isinstance(templates, list)

    def test_has_templates(self):
        """测试有模板数据"""
        templates = TemplateLoader.get_all()
        assert len(templates) > 0

    def test_template_has_required_fields(self):
        """测试模板有必需字段"""
        templates = TemplateLoader.get_all()
        for template in templates:
            assert template.id is not None
            assert template.name is not None
            assert template.stages is not None
            assert len(template.stages) > 0

    def test_get_by_id_existing(self):
        """测试获取存在的模板"""
        templates = TemplateLoader.get_all()
        first_id = templates[0].id

        template = TemplateLoader.get_by_id(first_id)
        assert template is not None
        assert template.id == first_id

    def test_get_by_id_nonexistent(self):
        """测试获取不存在的模板"""
        template = TemplateLoader.get_by_id("nonexistent-template-id")
        assert template is None

    def test_create_policy_from_template(self):
        """测试从模板创建策略"""
        templates = TemplateLoader.get_all()
        first_template = templates[0]

        policy = TemplateLoader.create_policy_from_template(first_template.id)
        assert isinstance(policy, LifecyclePolicy)
        assert policy.enabled is True
        assert policy.is_multi_stage is True
        assert policy.template_id == first_template.id

    def test_create_policy_from_nonexistent_template(self):
        """测试从不存在模板创建策略"""
        policy = TemplateLoader.create_policy_from_template("nonexistent")
        assert policy is None

    def test_create_policy_with_custom_retention(self):
        """测试自定义保留天数"""
        templates = TemplateLoader.get_all()
        first_template = templates[0]

        policy = TemplateLoader.create_policy_from_template(
            first_template.id,
            custom_retention_days=60,
        )
        assert policy is not None
        # 最后一个阶段应该扩展到 60 天
        if policy.stages:
            assert policy.stages[-1].end_day == 60

    def test_get_template_ids(self):
        """测试获取模板 ID 列表"""
        ids = TemplateLoader.get_template_ids()
        assert isinstance(ids, list)
        assert len(ids) > 0

    def test_validate_template_id_valid(self):
        """测试验证有效模板 ID"""
        templates = TemplateLoader.get_all()
        first_id = templates[0].id
        assert TemplateLoader.validate_template_id(first_id) is True

    def test_validate_template_id_invalid(self):
        """测试验证无效模板 ID"""
        assert TemplateLoader.validate_template_id("invalid-id") is False

    def test_get_summary(self):
        """测试获取摘要"""
        summary = TemplateLoader.get_summary()
        assert "total_count" in summary
        assert "templates" in summary


class TestTemplateContent:
    """模板内容测试"""

    @pytest.fixture(autouse=True)
    def setup(self):
        TemplateLoader.clear_cache()
        yield
        TemplateLoader.clear_cache()

    def test_short_term_hot_template(self):
        """测试短期热存储模板"""
        template = TemplateLoader.get_by_id("short_term_hot")
        if template:
            assert template.retention_days == 7
            assert len(template.stages) == 1
            assert template.stages[0].storage_class == "STANDARD"

    def test_standard_surveillance_template(self):
        """测试标准监控模板"""
        template = TemplateLoader.get_by_id("standard_surveillance")
        if template:
            assert template.retention_days == 30
            assert len(template.stages) == 2

    def test_compliance_retention_template(self):
        """测试合规存储模板"""
        template = TemplateLoader.get_by_id("compliance_retention")
        if template:
            assert template.retention_days == 90

    def test_low_cost_archive_template(self):
        """测试低成本归档模板"""
        template = TemplateLoader.get_by_id("low_cost_archive")
        if template:
            assert template.retention_days == 180


class TestGetByRetentionDays:
    """按保留天数获取测试"""

    @pytest.fixture(autouse=True)
    def setup(self):
        TemplateLoader.clear_cache()
        yield
        TemplateLoader.clear_cache()

    def test_get_by_retention_returns_list(self):
        """测试获取返回列表"""
        result = TemplateLoader.get_by_retention_days(min_days=1)
        assert isinstance(result, list)

    def test_get_by_min_days(self):
        """测试最小天数"""
        result = TemplateLoader.get_by_retention_days(min_days=30)
        for template in result:
            assert template.retention_days >= 30

    def test_get_by_range(self):
        """测试范围查询"""
        result = TemplateLoader.get_by_retention_days(min_days=7, max_days=90)
        for template in result:
            assert 7 <= template.retention_days <= 90


class TestLifecycleTemplateModel:
    """LifecycleTemplate 模型测试"""

    def test_to_lifecycle_policy(self):
        """测试转换为策略"""
        templates = TemplateLoader.get_all()
        if templates:
            template = templates[0]
            policy = template.to_lifecycle_policy()

            assert policy.enabled is True
            assert policy.template_id == template.id
            assert len(policy.stages) == len(template.stages)

    def test_storage_class_sequence(self):
        """测试存储类型序列"""
        templates = TemplateLoader.get_all()
        if templates:
            template = templates[0]
            sequence = template.storage_class_sequence
            assert isinstance(sequence, list)
            assert len(sequence) == len(template.stages)

    def test_stage_count(self):
        """测试阶段计数"""
        templates = TemplateLoader.get_all()
        if templates:
            template = templates[0]
            assert template.stage_count == len(template.stages)
