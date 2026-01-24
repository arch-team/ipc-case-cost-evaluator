"""方案对比 API 测试"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


class TestCompareAPI:
    """方案对比 API 测试"""

    @pytest.fixture
    def sample_request(self):
        """示例请求"""
        return {
            "functional": {
                "device_count": 1000,
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "retention_days": 30,
                "access_pattern": 0.1,
            },
            "technical": {
                "storage_class": "STANDARD",
            },
            "pricing": {
                "region": "ap-northeast-1",
                "discount_percent": 0.0,
            },
        }

    def test_compare_success(self, sample_request):
        """测试对比成功"""
        response = client.post("/api/v1/compare", json=sample_request)

        assert response.status_code == 200
        data = response.json()
        assert "baseline" in data
        assert "items" in data
        assert len(data["items"]) >= 2

    def test_compare_includes_standard(self, sample_request):
        """测试包含 Standard 选项"""
        response = client.post("/api/v1/compare", json=sample_request)

        assert response.status_code == 200
        items = response.json()["items"]
        names = [item["name"] for item in items]
        assert "S3 Standard" in names

    def test_compare_includes_glacier(self, sample_request):
        """测试包含 Glacier 选项"""
        response = client.post("/api/v1/compare", json=sample_request)

        assert response.status_code == 200
        items = response.json()["items"]
        names = [item["name"] for item in items]
        assert "S3 Glacier IR" in names

    def test_compare_includes_lifecycle(self, sample_request):
        """测试包含生命周期选项"""
        response = client.post("/api/v1/compare", json=sample_request)

        assert response.status_code == 200
        items = response.json()["items"]
        names = [item["name"] for item in items]
        lifecycle_items = [n for n in names if "Lifecycle" in n]
        assert len(lifecycle_items) > 0

    def test_compare_has_recommendation(self, sample_request):
        """测试有推荐结果"""
        response = client.post("/api/v1/compare", json=sample_request)

        assert response.status_code == 200
        data = response.json()
        assert "recommendation" in data
        if data["recommendation"]:
            assert "recommended_option" in data["recommendation"]
            assert "reason" in data["recommendation"]

    def test_compare_with_custom_lifecycle_days(self, sample_request):
        """测试自定义生命周期天数"""
        response = client.post(
            "/api/v1/compare",
            json=sample_request,
            params={"lifecycle_days": 14},
        )

        assert response.status_code == 200
        items = response.json()["items"]
        names = [item["name"] for item in items]
        assert any("14天" in n for n in names)

    def test_compare_without_lifecycle(self, sample_request):
        """测试不包含生命周期选项"""
        response = client.post(
            "/api/v1/compare",
            json=sample_request,
            params={"include_lifecycle": False},
        )

        assert response.status_code == 200
        items = response.json()["items"]
        names = [item["name"] for item in items]
        lifecycle_items = [n for n in names if "Lifecycle" in n]
        assert len(lifecycle_items) == 0

    def test_compare_items_have_breakdown(self, sample_request):
        """测试对比项有费用明细"""
        response = client.post("/api/v1/compare", json=sample_request)

        assert response.status_code == 200
        items = response.json()["items"]
        for item in items:
            assert "breakdown" in item
            if item["breakdown"]:
                assert "storage_cost" in item["breakdown"]

    def test_compare_items_have_vs_baseline(self, sample_request):
        """测试对比项有相对基准差异"""
        response = client.post("/api/v1/compare", json=sample_request)

        assert response.status_code == 200
        items = response.json()["items"]
        for item in items:
            assert "vs_baseline" in item


class TestCompareAPIValidation:
    """方案对比 API 验证测试"""

    def test_missing_device_count(self):
        """测试缺少设备数量"""
        request = {
            "functional": {
                "recording_mode": "event_triggered",
            },
        }
        response = client.post("/api/v1/compare", json=request)

        assert response.status_code == 422

    def test_invalid_lifecycle_days(self):
        """测试无效生命周期天数"""
        request = {
            "functional": {
                "device_count": 100,
            },
        }
        response = client.post(
            "/api/v1/compare",
            json=request,
            params={"lifecycle_days": 0},
        )

        # 应该返回验证错误或使用默认值
        assert response.status_code in [200, 422]


class TestCompareAPIEdgeCases:
    """方案对比 API 边界测试"""

    def test_single_device(self):
        """测试单设备"""
        request = {
            "functional": {
                "device_count": 1,
            },
        }
        response = client.post("/api/v1/compare", json=request)

        assert response.status_code == 200

    def test_high_access_pattern(self):
        """测试高访问比例"""
        request = {
            "functional": {
                "device_count": 100,
                "access_pattern": 0.8,
            },
        }
        response = client.post("/api/v1/compare", json=request)

        assert response.status_code == 200
        # 高访问时推荐可能不同
        data = response.json()
        assert len(data["items"]) >= 2

    def test_continuous_recording(self):
        """测试全天候录像"""
        request = {
            "functional": {
                "device_count": 100,
                "recording_mode": "continuous",
            },
        }
        response = client.post("/api/v1/compare", json=request)

        assert response.status_code == 200

    def test_long_retention(self):
        """测试长保留期"""
        request = {
            "functional": {
                "device_count": 100,
                "retention_days": 365,
            },
        }
        response = client.post("/api/v1/compare", json=request)

        assert response.status_code == 200
