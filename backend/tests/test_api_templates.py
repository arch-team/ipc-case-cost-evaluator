"""模板 API 测试"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """测试客户端"""
    return TestClient(app)


class TestTemplatesAPI:
    """模板 API 测试"""

    def test_get_all_templates(self, client):
        """测试获取所有模板"""
        response = client.get("/api/v1/templates")

        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        assert isinstance(data["templates"], list)

    def test_templates_have_required_fields(self, client):
        """测试模板有必需字段"""
        response = client.get("/api/v1/templates")
        data = response.json()

        for template in data["templates"]:
            assert "id" in template
            assert "name" in template
            assert "description" in template
            assert "stages" in template
            assert "retention_days" in template

    def test_get_templates_summary(self, client):
        """测试获取模板摘要"""
        response = client.get("/api/v1/templates/summary")

        assert response.status_code == 200
        data = response.json()
        assert "templates" in data

        # 摘要应该只有基本信息
        for template in data["templates"]:
            assert "id" in template
            assert "name" in template

    def test_get_template_by_id(self, client):
        """测试按 ID 获取模板"""
        # 先获取所有模板
        list_response = client.get("/api/v1/templates")
        templates = list_response.json()["templates"]

        if templates:
            first_id = templates[0]["id"]
            response = client.get(f"/api/v1/templates/{first_id}")

            assert response.status_code == 200
            data = response.json()
            assert data["id"] == first_id

    def test_get_template_by_id_not_found(self, client):
        """测试获取不存在的模板"""
        response = client.get("/api/v1/templates/nonexistent-id")

        assert response.status_code == 404

    def test_filter_by_retention(self, client):
        """测试按保留天数过滤"""
        response = client.get("/api/v1/templates/filter/by-retention?min_days=30")

        assert response.status_code == 200
        data = response.json()
        assert "templates" in data

    def test_filter_by_retention_min_days(self, client):
        """测试最小天数过滤"""
        response = client.get("/api/v1/templates/filter/by-retention?min_days=30")

        assert response.status_code == 200
        data = response.json()

        for template in data["templates"]:
            assert template["retention_days"] >= 30


class TestTemplateStages:
    """模板阶段测试"""

    def test_template_stages_valid(self, client):
        """测试模板阶段有效"""
        response = client.get("/api/v1/templates")
        data = response.json()

        for template in data["templates"]:
            stages = template["stages"]
            assert len(stages) > 0

            for stage in stages:
                assert "start_day" in stage
                assert "end_day" in stage
                assert "storage_class" in stage
                assert stage["start_day"] >= 1
                assert stage["end_day"] >= stage["start_day"]

    def test_template_stages_continuous(self, client):
        """测试模板阶段连续"""
        response = client.get("/api/v1/templates")
        data = response.json()

        for template in data["templates"]:
            stages = template["stages"]
            if len(stages) > 1:
                for i in range(1, len(stages)):
                    # 下一阶段的开始应该是上一阶段结束 + 1
                    assert stages[i]["start_day"] == stages[i - 1]["end_day"] + 1
