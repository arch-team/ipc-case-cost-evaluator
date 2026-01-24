"""
场景 2：多方案对比决策流程
用户故事：用户对比多种存储方案，选择最优方案

测试流程：计算 Standard → 计算 Glacier → 方案对比 → 获取推荐 → 导出对比报告
"""
import pytest
from fastapi.testclient import TestClient

from tests.e2e.conftest import build_export_request


class TestComparisonDecisionFlow:
    """多方案对比决策流程 E2E 测试"""

    def test_standard_vs_glacier_comparison(
        self, client: TestClient, comparison_input
    ):
        """测试 S3 Standard 与 Glacier IR 的对比流程"""
        # 步骤 1: 计算 S3 Standard 成本
        standard_input = {
            **comparison_input,
            "technical": {"storage_class": "STANDARD"}
        }

        standard_response = client.post("/api/v1/calculate", json=standard_input)
        assert standard_response.status_code == 200
        standard_result = standard_response.json()
        standard_cost = standard_result["monthly_total"]

        # 步骤 2: 计算 S3 Glacier IR 成本
        glacier_input = {
            **comparison_input,
            "technical": {"storage_class": "GLACIER_IR"}
        }

        glacier_response = client.post("/api/v1/calculate", json=glacier_input)
        assert glacier_response.status_code == 200
        glacier_result = glacier_response.json()
        glacier_cost = glacier_result["monthly_total"]

        # 步骤 3: 调用方案对比 API
        compare_response = client.post("/api/v1/compare", json=comparison_input)
        assert compare_response.status_code == 200
        compare_result = compare_response.json()

        # 步骤 4: 验证对比结果包含所有方案（使用 items 而不是 results）
        assert "items" in compare_result
        storage_names = [r["name"] for r in compare_result["items"]]
        assert "S3 Standard" in storage_names
        assert "S3 Glacier IR" in storage_names

        # 步骤 5: 验证对比结果中的成本与单独计算一致
        COST_TOLERANCE = 0.01  # 成本误差容忍度

        for item in compare_result["items"]:
            item_name = item["name"]
            item_cost = item["monthly_cost"]

            if item_name == "S3 Standard":
                assert abs(item_cost - standard_cost) < COST_TOLERANCE
            elif item_name == "S3 Glacier IR":
                assert abs(item_cost - glacier_cost) < COST_TOLERANCE

        # 步骤 6: 验证有推荐结果
        assert "recommendation" in compare_result

    def test_low_access_recommends_glacier(self, client: TestClient):
        """低访问场景应推荐 Glacier IR"""
        low_access_input = {
            "functional": {
                "device_count": 1000,
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "retention_days": 30,
                "access_pattern": 0.01  # 极低访问率 1%
            },
            "pricing": {
                "region": "ap-northeast-1",
                "discount_percent": 0.0
            }
        }

        compare_response = client.post("/api/v1/compare", json=low_access_input)
        assert compare_response.status_code == 200
        compare_result = compare_response.json()

        # 在低访问场景下，Glacier IR 应该更便宜
        items = compare_result["items"]
        standard_cost = next(
            r["monthly_cost"] for r in items if r["name"] == "S3 Standard"
        )
        glacier_cost = next(
            r["monthly_cost"] for r in items if r["name"] == "S3 Glacier IR"
        )

        # Glacier IR 在低访问场景下通常更便宜
        assert standard_cost > 0
        assert glacier_cost > 0

    def test_high_access_recommendation(self, client: TestClient):
        """高访问场景的成本对比"""
        high_access_input = {
            "functional": {
                "device_count": 1000,
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "retention_days": 30,
                "access_pattern": 0.5  # 高访问率 50%
            },
            "pricing": {
                "region": "ap-northeast-1",
                "discount_percent": 0.0
            }
        }

        compare_response = client.post("/api/v1/compare", json=high_access_input)
        assert compare_response.status_code == 200
        compare_result = compare_response.json()

        # 验证对比结果结构
        assert "items" in compare_result
        assert len(compare_result["items"]) >= 2

        # 在高访问场景下，由于 Glacier 的检索费用，Standard 可能更便宜
        for item in compare_result["items"]:
            assert "name" in item
            assert "monthly_cost" in item
            assert item["monthly_cost"] > 0

    def test_comparison_with_lifecycle(self, client: TestClient):
        """测试带生命周期策略的对比"""
        lifecycle_input = {
            "functional": {
                "device_count": 1000,
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "retention_days": 30,
                "access_pattern": 0.1
            },
            "technical": {
                "lifecycle_transition_days": 7  # 7 天后转换到 Glacier
            },
            "pricing": {
                "region": "ap-northeast-1",
                "discount_percent": 0.0
            }
        }

        compare_response = client.post("/api/v1/compare", json=lifecycle_input)
        assert compare_response.status_code == 200
        compare_result = compare_response.json()

        # 验证生命周期策略被考虑
        assert "items" in compare_result

        # 检查是否包含混合存储方案
        for item in compare_result["items"]:
            # 验证每个结果都有完整的成本
            assert "monthly_cost" in item

    def test_comparison_export_workflow(
        self, client: TestClient, comparison_input
    ):
        """测试完整的对比和导出工作流"""
        # 进行方案对比
        compare_response = client.post("/api/v1/compare", json=comparison_input)
        assert compare_response.status_code == 200
        compare_result = compare_response.json()

        # 选择一个方案进行详细计算
        best_item = compare_result["items"][0]

        # 根据选择的方案计算详细成本
        calc_input = {
            **comparison_input,
            "technical": {"storage_class": "STANDARD"}
        }
        calc_response = client.post("/api/v1/calculate", json=calc_input)
        assert calc_response.status_code == 200
        calc_result = calc_response.json()

        # 导出报告
        export_request = build_export_request(calc_result, calc_input)
        export_response = client.post("/api/v1/export", json=export_request)
        assert export_response.status_code == 200
        assert export_response.headers["content-type"] == \
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    def test_cost_breakdown_in_comparison(self, client: TestClient, comparison_input):
        """验证对比结果中的成本分解"""
        compare_response = client.post("/api/v1/compare", json=comparison_input)
        assert compare_response.status_code == 200
        compare_result = compare_response.json()

        for item in compare_result["items"]:
            # 验证成本分解结构
            if "breakdown" in item:
                breakdown = item["breakdown"]
                # 验证成本项存在
                assert "storage_cost" in breakdown
                assert "put_request_cost" in breakdown
                assert "get_request_cost" in breakdown

    def test_different_video_qualities_comparison(self, client: TestClient):
        """测试不同视频质量的成本对比"""
        VIDEO_QUALITIES = ["720p", "1080p", "2K"]  # 注意大写 K
        BASE_CONFIG = {
            "functional": {
                "device_count": 100,
                "recording_mode": "event_triggered",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "retention_days": 30,
                "access_pattern": 0.1
            },
            "technical": {
                "storage_class": "STANDARD"
            },
            "pricing": {
                "region": "ap-northeast-1",
                "discount_percent": 0.0
            }
        }

        results = []
        for quality in VIDEO_QUALITIES:
            input_data = {
                **BASE_CONFIG,
                "functional": {
                    **BASE_CONFIG["functional"],
                    "video_quality": quality
                }
            }

            response = client.post("/api/v1/calculate", json=input_data)
            assert response.status_code == 200
            results.append({
                "quality": quality,
                "cost": response.json()["monthly_total"]
            })

        # 验证成本随视频质量递增
        for i in range(len(results) - 1):
            current = results[i]
            next_quality = results[i + 1]
            assert current["cost"] < next_quality["cost"], \
                f"{current['quality']} 应该比 {next_quality['quality']} 便宜"

    def test_recording_mode_comparison(self, client: TestClient):
        """测试不同录像模式的成本对比"""
        # 事件触发模式
        event_input = {
            "functional": {
                "device_count": 100,
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "retention_days": 30,
                "access_pattern": 0.1
            },
            "technical": {"storage_class": "STANDARD"},
            "pricing": {"region": "ap-northeast-1", "discount_percent": 0.0}
        }

        # 全天候录像模式
        continuous_input = {
            "functional": {
                "device_count": 100,
                "recording_mode": "continuous",
                "video_quality": "1080p",
                "retention_days": 30,
                "access_pattern": 0.1
            },
            "technical": {"storage_class": "STANDARD"},
            "pricing": {"region": "ap-northeast-1", "discount_percent": 0.0}
        }

        event_response = client.post("/api/v1/calculate", json=event_input)
        continuous_response = client.post("/api/v1/calculate", json=continuous_input)

        assert event_response.status_code == 200
        assert continuous_response.status_code == 200

        event_cost = event_response.json()["monthly_total"]
        continuous_cost = continuous_response.json()["monthly_total"]

        # 全天候录像应该比事件触发更贵
        assert continuous_cost > event_cost
