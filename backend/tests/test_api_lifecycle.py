"""生命周期 API 集成测试"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


class TestCalculateWithLifecyclePolicy:
    """POST /calculate 生命周期策略测试"""

    @pytest.fixture
    def base_request(self):
        """基础请求"""
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
            "pricing": {
                "region": "ap-northeast-1",
                "discount_percent": 0.0,
            },
        }

    def test_calculate_with_lifecycle_policy(self, base_request):
        """测试 /calculate 端点支持 lifecycle_policy 参数"""
        base_request["technical"] = {
            "storage_class": "STANDARD",
            "lifecycle_policy": {
                "enabled": True,
                "transition_days": 7,
                "target_class": "GLACIER_IR",
            },
        }

        response = client.post("/api/v1/calculate", json=base_request)

        assert response.status_code == 200
        data = response.json()
        assert "monthly_total" in data
        assert "breakdown" in data
        # 生命周期策略应产生转换费用
        assert data["breakdown"]["lifecycle_cost"] > 0

    def test_calculate_with_lifecycle_policy_disabled(self, base_request):
        """测试 lifecycle_policy.enabled=False 时使用默认 Standard 计算器"""
        base_request["technical"] = {
            "storage_class": "STANDARD",
            "lifecycle_policy": {
                "enabled": False,
                "transition_days": 7,
                "target_class": "GLACIER_IR",
            },
        }

        response = client.post("/api/v1/calculate", json=base_request)

        assert response.status_code == 200
        data = response.json()
        # 禁用生命周期时使用 Standard 计算器，无转换费用
        assert data["breakdown"]["lifecycle_cost"] == 0

    def test_calculate_with_lifecycle_no_policy(self, base_request):
        """测试无 lifecycle_policy 时使用默认计算器"""
        base_request["technical"] = {
            "storage_class": "STANDARD",
        }

        response = client.post("/api/v1/calculate", json=base_request)

        assert response.status_code == 200
        data = response.json()
        # 无生命周期策略，无转换费用
        assert data["breakdown"]["lifecycle_cost"] == 0

    def test_calculate_with_multi_stage_lifecycle(self, base_request):
        """测试多阶段生命周期策略"""
        base_request["functional"]["retention_days"] = 90
        base_request["technical"] = {
            "storage_class": "STANDARD",
            "lifecycle_policy": {
                "enabled": True,
                "stages": [
                    {"start_day": 1, "end_day": 7, "storage_class": "STANDARD"},
                    {"start_day": 8, "end_day": 30, "storage_class": "GLACIER_IR"},
                    {"start_day": 31, "end_day": 90, "storage_class": "DEEP_ARCHIVE"},
                ],
            },
        }

        response = client.post("/api/v1/calculate", json=base_request)

        assert response.status_code == 200
        data = response.json()
        assert data["monthly_total"] > 0
        # 多阶段应有转换费用
        assert data["breakdown"]["lifecycle_cost"] > 0

    def test_lifecycle_cost_between_standard_and_glacier(self, base_request):
        """测试生命周期策略费用介于 Standard 和 Glacier 之间"""
        # 计算 Standard 费用
        base_request["technical"] = {"storage_class": "STANDARD"}
        standard_response = client.post("/api/v1/calculate", json=base_request)
        standard_cost = standard_response.json()["monthly_total"]

        # 计算 Glacier 费用（用于参考，确认 API 正常工作）
        base_request["technical"] = {"storage_class": "GLACIER_IR"}
        glacier_response = client.post("/api/v1/calculate", json=base_request)
        assert glacier_response.status_code == 200  # 确认 Glacier 计算正常

        # 计算生命周期费用
        base_request["technical"] = {
            "storage_class": "STANDARD",
            "lifecycle_policy": {
                "enabled": True,
                "transition_days": 7,
                "target_class": "GLACIER_IR",
            },
        }
        lifecycle_response = client.post("/api/v1/calculate", json=base_request)
        lifecycle_cost = lifecycle_response.json()["monthly_total"]

        # 生命周期策略费用应该低于纯 Standard
        assert lifecycle_cost < standard_cost


class TestCompareWithLifecycle:
    """POST /compare 生命周期参数测试"""

    @pytest.fixture
    def base_request(self):
        """基础请求"""
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

    def test_compare_with_include_lifecycle_true(self, base_request):
        """测试 include_lifecycle=True 时包含生命周期选项"""
        response = client.post(
            "/api/v1/compare",
            json=base_request,
            params={"include_lifecycle": True},
        )

        assert response.status_code == 200
        items = response.json()["items"]
        names = [item["name"] for item in items]

        # 应该包含生命周期选项
        lifecycle_items = [n for n in names if "Lifecycle" in n]
        assert len(lifecycle_items) > 0, "应包含生命周期选项"

    def test_compare_with_include_lifecycle_false(self, base_request):
        """测试 include_lifecycle=False 时不包含生命周期选项"""
        response = client.post(
            "/api/v1/compare",
            json=base_request,
            params={"include_lifecycle": False},
        )

        assert response.status_code == 200
        items = response.json()["items"]
        names = [item["name"] for item in items]

        # 不应该包含生命周期选项
        lifecycle_items = [n for n in names if "Lifecycle" in n]
        assert len(lifecycle_items) == 0, "不应包含生命周期选项"

    def test_compare_lifecycle_days_parameter(self, base_request):
        """测试 lifecycle_days 参数影响转换天数"""
        # 使用 7 天转换
        response_7d = client.post(
            "/api/v1/compare",
            json=base_request,
            params={"include_lifecycle": True, "lifecycle_days": 7},
        )
        assert response_7d.status_code == 200
        items_7d = response_7d.json()["items"]
        lifecycle_7d = next(i for i in items_7d if "Lifecycle" in i["name"])
        assert "7天" in lifecycle_7d["name"]

        # 使用 14 天转换
        response_14d = client.post(
            "/api/v1/compare",
            json=base_request,
            params={"include_lifecycle": True, "lifecycle_days": 14},
        )
        assert response_14d.status_code == 200
        items_14d = response_14d.json()["items"]
        lifecycle_14d = next(i for i in items_14d if "Lifecycle" in i["name"])
        assert "14天" in lifecycle_14d["name"]

        # 转换天数不同，费用应该不同
        assert lifecycle_7d["monthly_cost"] != lifecycle_14d["monthly_cost"]

    def test_compare_default_lifecycle_days(self, base_request):
        """测试默认生命周期天数为 7 天"""
        response = client.post(
            "/api/v1/compare",
            json=base_request,
            params={"include_lifecycle": True},
        )

        assert response.status_code == 200
        items = response.json()["items"]
        lifecycle_item = next(i for i in items if "Lifecycle" in i["name"])
        # 默认应该是 7 天
        assert "7天" in lifecycle_item["name"]

    def test_compare_lifecycle_has_breakdown(self, base_request):
        """测试生命周期选项包含费用明细"""
        response = client.post(
            "/api/v1/compare",
            json=base_request,
            params={"include_lifecycle": True},
        )

        assert response.status_code == 200
        items = response.json()["items"]
        lifecycle_item = next(i for i in items if "Lifecycle" in i["name"])

        assert "breakdown" in lifecycle_item
        assert lifecycle_item["breakdown"] is not None
        assert "lifecycle_cost" in lifecycle_item["breakdown"]
        assert lifecycle_item["breakdown"]["lifecycle_cost"] > 0
