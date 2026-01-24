"""成本计算 API 测试"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


class TestCalculateAPI:
    """成本计算 API 测试"""

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

    def test_calculate_success(self, sample_request):
        """测试计算成功"""
        response = client.post("/api/v1/calculate", json=sample_request)

        assert response.status_code == 200
        data = response.json()
        assert "monthly_total" in data
        assert "per_device_monthly" in data
        assert "breakdown" in data
        assert data["monthly_total"] > 0

    def test_calculate_with_defaults(self):
        """测试使用默认值计算"""
        request = {
            "functional": {
                "device_count": 100,
            },
        }
        response = client.post("/api/v1/calculate", json=request)

        assert response.status_code == 200
        data = response.json()
        assert data["device_count"] == 100

    def test_calculate_glacier(self, sample_request):
        """测试 Glacier 存储类型计算"""
        sample_request["technical"]["storage_class"] = "GLACIER_IR"

        response = client.post("/api/v1/calculate", json=sample_request)

        assert response.status_code == 200
        data = response.json()
        assert data["breakdown"]["retrieval_cost"] >= 0

    def test_calculate_with_discount(self, sample_request):
        """测试带折扣计算"""
        sample_request["pricing"]["discount_percent"] = 0.1

        response = client.post("/api/v1/calculate", json=sample_request)

        assert response.status_code == 200

    def test_calculate_continuous_recording(self, sample_request):
        """测试全天候录像"""
        sample_request["functional"]["recording_mode"] = "continuous"
        del sample_request["functional"]["events_per_day"]
        del sample_request["functional"]["event_duration_sec"]

        response = client.post("/api/v1/calculate", json=sample_request)

        assert response.status_code == 200

    def test_calculate_returns_breakdown(self, sample_request):
        """测试返回费用明细"""
        response = client.post("/api/v1/calculate", json=sample_request)

        assert response.status_code == 200
        breakdown = response.json()["breakdown"]
        assert "storage_cost" in breakdown
        assert "put_request_cost" in breakdown
        assert "get_request_cost" in breakdown

    def test_calculate_returns_metrics(self, sample_request):
        """测试返回中间指标"""
        response = client.post("/api/v1/calculate", json=sample_request)

        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data
        if data["metrics"]:
            assert "daily_data_gb" in data["metrics"]
            assert "monthly_puts" in data["metrics"]


class TestCalculateAPIValidation:
    """成本计算 API 验证测试"""

    def test_missing_device_count(self):
        """测试缺少设备数量"""
        request = {
            "functional": {
                "recording_mode": "event_triggered",
            },
        }
        response = client.post("/api/v1/calculate", json=request)

        assert response.status_code == 422

    def test_invalid_device_count(self):
        """测试无效设备数量"""
        request = {
            "functional": {
                "device_count": 0,
            },
        }
        response = client.post("/api/v1/calculate", json=request)

        assert response.status_code == 422

    def test_invalid_access_pattern(self):
        """测试无效访问比例"""
        request = {
            "functional": {
                "device_count": 100,
                "access_pattern": 1.5,  # 超过 1.0
            },
        }
        response = client.post("/api/v1/calculate", json=request)

        assert response.status_code == 422

    def test_invalid_storage_class(self):
        """测试无效存储类型"""
        request = {
            "functional": {
                "device_count": 100,
            },
            "technical": {
                "storage_class": "INVALID",
            },
        }
        response = client.post("/api/v1/calculate", json=request)

        assert response.status_code == 422

    def test_invalid_region(self):
        """测试无效区域"""
        request = {
            "functional": {
                "device_count": 100,
            },
            "pricing": {
                "region": "invalid-region",
            },
        }
        response = client.post("/api/v1/calculate", json=request)

        # 区域验证可能在计算时失败
        assert response.status_code in [422, 400]


class TestCalculateAPIEdgeCases:
    """成本计算 API 边界测试"""

    def test_single_device(self):
        """测试单设备"""
        request = {
            "functional": {
                "device_count": 1,
            },
        }
        response = client.post("/api/v1/calculate", json=request)

        assert response.status_code == 200

    def test_large_scale(self):
        """测试大规模场景"""
        request = {
            "functional": {
                "device_count": 100000,
                "recording_mode": "event_triggered",
                "retention_days": 90,
            },
        }
        response = client.post("/api/v1/calculate", json=request)

        assert response.status_code == 200
        data = response.json()
        assert data["device_count"] == 100000

    def test_max_retention(self):
        """测试最大保留天数"""
        request = {
            "functional": {
                "device_count": 100,
                "retention_days": 365,
            },
        }
        response = client.post("/api/v1/calculate", json=request)

        assert response.status_code == 200

    def test_zero_access_pattern(self):
        """测试零访问比例"""
        request = {
            "functional": {
                "device_count": 100,
                "access_pattern": 0.0,
            },
        }
        response = client.post("/api/v1/calculate", json=request)

        assert response.status_code == 200
        data = response.json()
        assert data["breakdown"]["get_request_cost"] == 0
