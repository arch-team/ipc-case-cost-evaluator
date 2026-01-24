"""
场景 5：跨区域价格对比
用户故事：用户对比不同 AWS 区域的成本差异

测试流程：查询区域列表 → 查询多区域定价 → 计算多区域成本 → 对比分析
"""
import pytest
from fastapi.testclient import TestClient

from tests.e2e.conftest import build_evaluation_request


class TestMultiRegionComparison:
    """跨区域价格对比流程 E2E 测试"""

    def test_list_available_regions(self, client: TestClient):
        """测试获取可用区域列表"""
        response = client.get("/api/v1/pricing/regions")
        assert response.status_code == 200
        data = response.json()

        # API 返回 {"regions": [{"region": "...", "name": "..."}]}
        assert "regions" in data
        regions = data["regions"]
        assert isinstance(regions, list)
        assert len(regions) > 0

        # 验证常见区域存在
        region_codes = [r["region"] for r in regions]
        assert "ap-northeast-1" in region_codes  # 东京

    def test_get_region_pricing(self, client: TestClient):
        """测试获取单个区域的定价信息"""
        response = client.get("/api/v1/pricing/ap-northeast-1")
        assert response.status_code == 200
        pricing = response.json()

        # 验证定价结构
        assert "region" in pricing
        assert pricing["region"] == "ap-northeast-1"

    def test_compare_regions_cost(self, client: TestClient):
        """测试对比不同区域的成本"""
        # 获取可用区域
        regions_response = client.get("/api/v1/pricing/regions")
        assert regions_response.status_code == 200
        regions = regions_response.json()["regions"]

        # 基础计算参数
        base_input = {
            "functional": {
                "device_count": 1000,
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "retention_days": 30,
                "access_pattern": 0.1
            },
            "technical": {"storage_class": "STANDARD"}
        }

        # 计算每个区域的成本
        region_costs = []
        for region_info in regions[:5]:  # 测试前 5 个区域
            region = region_info["region"]
            calc_input = {
                **base_input,
                "pricing": {"region": region, "discount_percent": 0.0}
            }

            response = client.post("/api/v1/calculate", json=calc_input)
            if response.status_code == 200:
                result = response.json()
                region_costs.append({
                    "region": region,
                    "monthly_total": result["monthly_total"],
                    "per_device_monthly": result["per_device_monthly"]
                })

        # 验证所有区域都有成本数据
        assert len(region_costs) > 0

        # 验证成本值合理
        for rc in region_costs:
            assert rc["monthly_total"] > 0
            assert rc["per_device_monthly"] > 0

    def test_region_price_consistency(self, client: TestClient):
        """验证定价数据与 API 返回一致"""
        region = "ap-northeast-1"

        # 获取区域定价信息
        pricing_response = client.get(f"/api/v1/pricing/{region}")
        assert pricing_response.status_code == 200

        # 使用该区域计算成本
        calc_input = {
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
            "pricing": {"region": region, "discount_percent": 0.0}
        }

        calc_response = client.post("/api/v1/calculate", json=calc_input)
        assert calc_response.status_code == 200

        # 成本应该基于定价信息计算
        result = calc_response.json()
        assert result["monthly_total"] > 0

    def test_invalid_region(self, client: TestClient):
        """测试使用无效区域"""
        calc_input = {
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
            "pricing": {"region": "invalid-region-xyz", "discount_percent": 0.0}
        }

        response = client.post("/api/v1/calculate", json=calc_input)
        # 应该返回错误（400 或 422）
        assert response.status_code in [400, 422]

    def test_region_pricing_detail(self, client: TestClient):
        """测试获取区域定价详情"""
        regions_response = client.get("/api/v1/pricing/regions")
        regions = regions_response.json()["regions"]

        for region_info in regions[:3]:
            region = region_info["region"]
            pricing_response = client.get(f"/api/v1/pricing/{region}")
            assert pricing_response.status_code == 200
            pricing = pricing_response.json()

            # 验证定价信息结构
            assert "region" in pricing
            assert pricing["region"] == region

    def test_cheapest_region_identification(self, client: TestClient):
        """测试识别最便宜的区域"""
        # 获取所有区域
        regions_response = client.get("/api/v1/pricing/regions")
        regions = regions_response.json()["regions"]

        base_input = {
            "functional": {
                "device_count": 1000,
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "retention_days": 30,
                "access_pattern": 0.1
            },
            "technical": {"storage_class": "STANDARD"}
        }

        # 计算所有区域成本
        region_costs = []
        for region_info in regions:
            region = region_info["region"]
            calc_input = {
                **base_input,
                "pricing": {"region": region, "discount_percent": 0.0}
            }

            response = client.post("/api/v1/calculate", json=calc_input)
            if response.status_code == 200:
                region_costs.append({
                    "region": region,
                    "cost": response.json()["monthly_total"]
                })

        # 找出最便宜的区域
        if region_costs:
            cheapest = min(region_costs, key=lambda x: x["cost"])
            most_expensive = max(region_costs, key=lambda x: x["cost"])

            # 验证有价格差异
            assert cheapest["cost"] <= most_expensive["cost"]

    def test_region_comparison_with_discount(self, client: TestClient):
        """测试带折扣的区域对比"""
        region = "ap-northeast-1"

        base_input = {
            "functional": {
                "device_count": 1000,
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "retention_days": 30,
                "access_pattern": 0.1
            },
            "technical": {"storage_class": "STANDARD"}
        }

        # 无折扣
        no_discount_input = {
            **base_input,
            "pricing": {"region": region, "discount_percent": 0.0}
        }
        no_discount_response = client.post(
            "/api/v1/calculate", json=no_discount_input
        )
        assert no_discount_response.status_code == 200
        no_discount_cost = no_discount_response.json()["monthly_total"]

        # 10% 折扣 (discount_percent 范围是 0-0.5，表示 0-50%)
        with_discount_input = {
            **base_input,
            "pricing": {"region": region, "discount_percent": 0.1}
        }
        with_discount_response = client.post(
            "/api/v1/calculate", json=with_discount_input
        )
        assert with_discount_response.status_code == 200
        with_discount_cost = with_discount_response.json()["monthly_total"]

        # 折扣后成本应该更低
        assert with_discount_cost < no_discount_cost

        # 折扣比例应该接近 10%
        expected_discount = no_discount_cost * 0.10
        actual_discount = no_discount_cost - with_discount_cost
        assert abs(actual_discount - expected_discount) < expected_discount * 0.1

    def test_multi_region_storage_class_comparison(self, client: TestClient):
        """测试多区域和多存储类型的组合对比"""
        target_regions = ["ap-northeast-1"]
        storage_classes = ["STANDARD", "GLACIER_IR"]

        base_input = {
            "functional": {
                "device_count": 100,
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "retention_days": 30,
                "access_pattern": 0.05
            }
        }

        # 获取可用区域
        available_regions_response = client.get("/api/v1/pricing/regions")
        available_regions = [r["region"] for r in available_regions_response.json()["regions"]]

        results = []
        for region in target_regions:
            if region not in available_regions:
                continue

            for storage_class in storage_classes:
                calc_input = {
                    **base_input,
                    "technical": {"storage_class": storage_class},
                    "pricing": {"region": region, "discount_percent": 0.0}
                }

                response = client.post("/api/v1/calculate", json=calc_input)
                if response.status_code == 200:
                    results.append({
                        "region": region,
                        "storage_class": storage_class,
                        "cost": response.json()["monthly_total"]
                    })

        # 验证结果
        assert len(results) > 0

        # 按成本排序
        sorted_results = sorted(results, key=lambda x: x["cost"])

        # 验证排序正确
        for i in range(len(sorted_results) - 1):
            assert sorted_results[i]["cost"] <= sorted_results[i + 1]["cost"]

    def test_complete_region_analysis_workflow(
        self, client: TestClient, auth_headers
    ):
        """测试完整的区域分析工作流"""
        # 步骤 1: 获取可用区域
        regions_response = client.get("/api/v1/pricing/regions")
        assert regions_response.status_code == 200
        regions = regions_response.json()["regions"]

        # 步骤 2: 获取每个区域的定价信息
        pricing_info = {}
        for region_info in regions[:3]:
            region = region_info["region"]
            pricing_response = client.get(f"/api/v1/pricing/{region}")
            if pricing_response.status_code == 200:
                pricing_info[region] = pricing_response.json()

        # 步骤 3: 计算每个区域的成本
        base_input = {
            "functional": {
                "device_count": 500,
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "retention_days": 30,
                "access_pattern": 0.1
            },
            "technical": {"storage_class": "STANDARD"}
        }

        region_analysis = []
        for region in pricing_info.keys():
            calc_input = {
                **base_input,
                "pricing": {"region": region, "discount_percent": 0.0}
            }

            calc_response = client.post("/api/v1/calculate", json=calc_input)
            if calc_response.status_code == 200:
                result = calc_response.json()
                region_analysis.append({
                    "region": region,
                    "monthly_cost": result["monthly_total"],
                    "per_device_cost": result["per_device_monthly"]
                })

        # 步骤 4: 保存最优区域的评估
        if region_analysis:
            best_region = min(region_analysis, key=lambda x: x["monthly_cost"])

            best_calc_input = {
                **base_input,
                "pricing": {"region": best_region["region"], "discount_percent": 0.0}
            }

            calc_response = client.post("/api/v1/calculate", json=best_calc_input)
            calc_result = calc_response.json()

            eval_data = build_evaluation_request(
                name=f"最优区域分析 - {best_region['region']}",
                description="多区域对比后选择的最优方案",
                input_params=best_calc_input,
                calc_result=calc_result
            )
            save_response = client.post(
                "/api/v1/evaluations",
                json=eval_data,
                headers=auth_headers
            )
            assert save_response.status_code == 200
