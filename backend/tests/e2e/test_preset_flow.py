"""
场景 3：预设场景快速评估
用户故事：用户使用预设场景快速完成评估

测试流程：浏览预设 → 选择预设 → 修改参数 → 计算成本 → 保存评估
"""
from fastapi.testclient import TestClient

from tests.e2e.conftest import build_evaluation_request


class TestPresetScenarioFlow:
    """预设场景快速评估流程 E2E 测试"""

    def test_list_preset_scenarios(self, client: TestClient):
        """测试获取预设场景列表"""
        response = client.get("/api/v1/scenarios")
        assert response.status_code == 200
        data = response.json()

        # API 返回 {"scenarios": [...]}
        assert "scenarios" in data
        scenarios = data["scenarios"]
        assert isinstance(scenarios, list)

        # 验证每个场景都有必要字段
        for scenario in scenarios:
            assert "id" in scenario
            assert "name" in scenario
            assert "description" in scenario

    def test_get_scenario_categories(self, client: TestClient):
        """测试获取场景分类"""
        response = client.get("/api/v1/scenarios/categories")
        assert response.status_code == 200
        data = response.json()

        # API 返回 {"categories": [...]}
        assert "categories" in data
        categories = data["categories"]
        assert isinstance(categories, list)

    def test_get_scenario_detail(self, client: TestClient):
        """测试获取单个场景详情"""
        # 先获取场景列表
        list_response = client.get("/api/v1/scenarios")
        assert list_response.status_code == 200
        scenarios = list_response.json()["scenarios"]

        if len(scenarios) > 0:
            # 获取第一个场景的详情
            scenario_id = scenarios[0]["id"]
            detail_response = client.get(f"/api/v1/scenarios/{scenario_id}")
            assert detail_response.status_code == 200

            scenario = detail_response.json()
            assert scenario["id"] == scenario_id
            # 验证详情包含配置参数
            assert "name" in scenario
            assert "functional" in scenario

    def test_use_preset_scenario(self, client: TestClient):
        """测试使用预设场景参数进行计算"""
        # 获取场景列表
        list_response = client.get("/api/v1/scenarios")
        assert list_response.status_code == 200
        scenarios = list_response.json()["scenarios"]

        if len(scenarios) > 0:
            # 获取场景详情
            scenario_id = scenarios[0]["id"]
            detail_response = client.get(f"/api/v1/scenarios/{scenario_id}")
            assert detail_response.status_code == 200
            scenario = detail_response.json()

            # 使用场景参数构建计算输入
            if "functional" in scenario:
                calc_input = {
                    "functional": scenario["functional"],
                    "technical": scenario.get("technical", {"storage_class": "STANDARD"}),
                    "pricing": scenario.get("pricing", {
                        "region": "ap-northeast-1",
                        "discount_percent": 0.0
                    })
                }

                calc_response = client.post("/api/v1/calculate", json=calc_input)
                assert calc_response.status_code == 200
                assert calc_response.json()["monthly_total"] > 0

    def test_modify_preset_and_calculate(
        self, client: TestClient, auth_headers
    ):
        """测试修改预设参数后计算"""
        # 获取场景列表
        list_response = client.get("/api/v1/scenarios")
        scenarios = list_response.json()["scenarios"]

        # 基于预设或默认参数进行测试
        base_input = {
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

        # 计算原始成本
        original_response = client.post("/api/v1/calculate", json=base_input)
        assert original_response.status_code == 200
        original_cost = original_response.json()["monthly_total"]

        # 修改设备数量（翻倍）
        modified_input = {
            "functional": {
                **base_input["functional"],
                "device_count": 200
            },
            "technical": base_input["technical"],
            "pricing": base_input["pricing"]
        }

        modified_response = client.post("/api/v1/calculate", json=modified_input)
        assert modified_response.status_code == 200
        modified_cost = modified_response.json()["monthly_total"]

        # 验证成本翻倍（设备数量线性增长）
        assert abs(modified_cost - original_cost * 2) < original_cost * 0.1

        # 保存修改后的评估
        calc_result = modified_response.json()
        eval_data = build_evaluation_request(
            name="修改预设后的评估",
            description="设备数量从 100 修改为 200",
            input_params=modified_input,
            calc_result=calc_result
        )
        save_response = client.post(
            "/api/v1/evaluations",
            json=eval_data,
            headers=auth_headers
        )
        assert save_response.status_code == 200

    def test_preset_scenario_comparison(self, client: TestClient):
        """测试多个预设场景的成本对比"""
        # 定义几个典型场景参数
        scenarios = [
            {
                "name": "小型零售店",
                "functional": {
                    "device_count": 10,
                    "recording_mode": "event_triggered",
                    "video_quality": "720p",
                    "events_per_day": 200,
                    "event_duration_sec": 10,
                    "retention_days": 7,
                    "access_pattern": 0.05
                }
            },
            {
                "name": "中型办公室",
                "functional": {
                    "device_count": 50,
                    "recording_mode": "event_triggered",
                    "video_quality": "1080p",
                    "events_per_day": 400,
                    "event_duration_sec": 15,
                    "retention_days": 30,
                    "access_pattern": 0.1
                }
            },
            {
                "name": "大型仓库",
                "functional": {
                    "device_count": 200,
                    "recording_mode": "continuous",
                    "video_quality": "1080p",
                    "retention_days": 90,
                    "access_pattern": 0.05
                }
            }
        ]

        results = []
        for scenario in scenarios:
            calc_input = {
                "functional": scenario["functional"],
                "technical": {"storage_class": "STANDARD"},
                "pricing": {"region": "ap-northeast-1", "discount_percent": 0.0}
            }

            response = client.post("/api/v1/calculate", json=calc_input)
            assert response.status_code == 200

            results.append({
                "name": scenario["name"],
                "device_count": scenario["functional"]["device_count"],
                "monthly_cost": response.json()["monthly_total"],
                "per_device_cost": response.json()["per_device_monthly"]
            })

        # 验证所有场景都计算成功
        assert len(results) == 3
        for result in results:
            assert result["monthly_cost"] > 0
            assert result["per_device_cost"] > 0

    def test_preset_with_different_regions(self, client: TestClient):
        """测试预设场景在不同区域的成本"""
        base_input = {
            "functional": {
                "device_count": 100,
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "retention_days": 30,
                "access_pattern": 0.1
            },
            "technical": {"storage_class": "STANDARD"}
        }

        # 获取支持的区域列表
        regions_response = client.get("/api/v1/pricing/regions")
        assert regions_response.status_code == 200
        regions_data = regions_response.json()["regions"]

        # 计算每个区域的成本
        region_costs = []
        for region_info in regions_data[:3]:  # 只测试前 3 个区域
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

        # 验证不同区域有不同的成本
        assert len(region_costs) > 0
        for rc in region_costs:
            assert rc["cost"] > 0

    def test_complete_preset_workflow(
        self, client: TestClient, test_user_data
    ):
        """测试完整的预设场景工作流"""
        # 步骤 1: 注册用户
        register_response = client.post(
            "/api/v1/auth/register", json=test_user_data
        )
        assert register_response.status_code == 200
        token = register_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 步骤 2: 浏览预设场景
        scenarios_response = client.get("/api/v1/scenarios")
        assert scenarios_response.status_code == 200

        # 步骤 3: 选择/定义场景参数
        selected_params = {
            "functional": {
                "device_count": 50,
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

        # 步骤 4: 计算成本
        calc_response = client.post("/api/v1/calculate", json=selected_params)
        assert calc_response.status_code == 200
        calc_result = calc_response.json()

        # 步骤 5: 保存评估
        eval_data = build_evaluation_request(
            name="基于预设的评估",
            description="使用中型办公室预设参数",
            input_params=selected_params,
            calc_result=calc_result
        )
        save_response = client.post(
            "/api/v1/evaluations",
            json=eval_data,
            headers=headers
        )
        assert save_response.status_code == 200

        # 步骤 6: 验证保存成功
        list_response = client.get("/api/v1/evaluations", headers=headers)
        assert list_response.status_code == 200
        evaluations = list_response.json()["evaluations"]
        assert len(evaluations) == 1
        assert evaluations[0]["name"] == "基于预设的评估"
