"""预设场景 API 测试"""
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


class TestScenariosAPI:
    """预设场景 API 测试"""

    def test_list_scenarios(self):
        """测试获取场景列表"""
        response = client.get("/api/v1/scenarios")

        assert response.status_code == 200
        data = response.json()
        assert "scenarios" in data
        assert len(data["scenarios"]) > 0

    def test_scenario_has_required_fields(self):
        """测试场景包含必要字段"""
        response = client.get("/api/v1/scenarios")

        assert response.status_code == 200
        scenarios = response.json()["scenarios"]
        for scenario in scenarios:
            assert "id" in scenario
            assert "name" in scenario
            assert "description" in scenario
            assert "category" in scenario
            assert "functional" in scenario

    def test_get_scenario_by_id(self):
        """测试按 ID 获取场景"""
        response = client.get("/api/v1/scenarios/small-retail")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "small-retail"
        assert data["name"] == "小型零售店"

    def test_get_scenario_not_found(self):
        """测试获取不存在的场景"""
        response = client.get("/api/v1/scenarios/non-existent")

        assert response.status_code == 404

    def test_list_categories(self):
        """测试获取分类列表"""
        response = client.get("/api/v1/scenarios/categories")

        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0

    def test_category_has_required_fields(self):
        """测试分类包含必要字段"""
        response = client.get("/api/v1/scenarios/categories")

        assert response.status_code == 200
        categories = response.json()["categories"]
        for category in categories:
            assert "id" in category
            assert "name" in category

    def test_filter_by_category(self):
        """测试按分类筛选"""
        response = client.get("/api/v1/scenarios", params={"category": "retail"})

        assert response.status_code == 200
        scenarios = response.json()["scenarios"]
        for scenario in scenarios:
            assert scenario["category"] == "retail"

    def test_scenario_functional_dimensions(self):
        """测试场景功能维度"""
        response = client.get("/api/v1/scenarios/small-retail")

        assert response.status_code == 200
        functional = response.json()["functional"]
        assert "device_count" in functional
        assert "recording_mode" in functional
        assert "video_quality" in functional

    def test_scenario_technical_dimensions(self):
        """测试场景技术维度"""
        response = client.get("/api/v1/scenarios/small-retail")

        assert response.status_code == 200
        technical = response.json()["technical"]
        assert "storage_class" in technical

    def test_scenario_pricing_dimensions(self):
        """测试场景价格维度"""
        response = client.get("/api/v1/scenarios/small-retail")

        assert response.status_code == 200
        pricing = response.json()["pricing"]
        assert "region" in pricing


class TestScenariosAPIEdgeCases:
    """预设场景 API 边界测试"""

    def test_filter_empty_category(self):
        """测试筛选空分类"""
        response = client.get("/api/v1/scenarios", params={"category": "nonexistent"})

        assert response.status_code == 200
        scenarios = response.json()["scenarios"]
        assert len(scenarios) == 0

    def test_multiple_retail_scenarios(self):
        """测试零售类有多个场景"""
        response = client.get("/api/v1/scenarios", params={"category": "retail"})

        assert response.status_code == 200
        scenarios = response.json()["scenarios"]
        assert len(scenarios) >= 2

    def test_all_scenarios_have_valid_config(self):
        """测试所有场景配置有效"""
        response = client.get("/api/v1/scenarios")

        assert response.status_code == 200
        scenarios = response.json()["scenarios"]
        for scenario in scenarios:
            # 设备数量必须为正数
            assert scenario["functional"]["device_count"] > 0
            # 保留天数必须为正数
            assert scenario["functional"]["retention_days"] > 0
