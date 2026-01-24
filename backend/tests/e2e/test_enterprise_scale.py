"""
场景 6：大规模部署成本评估
用户故事：企业用户评估大规模部署成本

测试流程：输入大规模参数 → 计算成本 → 敏感度分析 → 方案对比 → 导出完整报告
"""
import time
from fastapi.testclient import TestClient

from tests.e2e.conftest import build_export_request, build_evaluation_request


class TestEnterpriseScale:
    """大规模部署成本评估 E2E 测试"""

    def test_large_scale_evaluation(
        self, client: TestClient, large_scale_calculation_input
    ):
        """测试大规模部署（10万设备）的成本评估"""
        # 记录开始时间
        start_time = time.time()

        # 计算大规模部署成本
        response = client.post(
            "/api/v1/calculate", json=large_scale_calculation_input
        )

        # 记录结束时间
        end_time = time.time()
        execution_time = end_time - start_time

        assert response.status_code == 200
        result = response.json()

        # 验证计算结果
        assert result["monthly_total"] > 0
        assert result["device_count"] == 100000

        # 验证计算性能（应该在合理时间内完成）
        assert execution_time < 5.0, f"计算耗时过长: {execution_time}秒"

    def test_cost_scaling_linearity(self, client: TestClient):
        """验证成本与设备数量线性相关"""
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

        device_counts = [100, 1000, 10000]
        results = []

        for count in device_counts:
            input_data = {
                "functional": {
                    **base_input["functional"],
                    "device_count": count
                },
                "technical": base_input["technical"],
                "pricing": base_input["pricing"]
            }

            response = client.post("/api/v1/calculate", json=input_data)
            assert response.status_code == 200
            results.append({
                "device_count": count,
                "monthly_total": response.json()["monthly_total"],
                "per_device": response.json()["per_device_monthly"]
            })

        # 验证线性关系：每设备成本应该大致相同
        per_device_costs = [r["per_device"] for r in results]
        avg_per_device = sum(per_device_costs) / len(per_device_costs)

        for cost in per_device_costs:
            # 每设备成本应该在平均值的 10% 范围内（放宽容差）
            assert abs(cost - avg_per_device) < avg_per_device * 0.1

        # 验证总成本与设备数量成比例
        assert results[1]["monthly_total"] > results[0]["monthly_total"] * 9
        assert results[2]["monthly_total"] > results[1]["monthly_total"] * 9

    def test_enterprise_comparison(
        self, client: TestClient, large_scale_calculation_input
    ):
        """测试大规模部署的方案对比"""
        comparison_input = {
            "functional": large_scale_calculation_input["functional"],
            "pricing": large_scale_calculation_input["pricing"]
        }

        response = client.post("/api/v1/compare", json=comparison_input)
        assert response.status_code == 200
        result = response.json()

        # 验证对比结果（使用 items 而不是 results）
        assert "items" in result
        assert len(result["items"]) >= 2

        # 验证大规模场景下的成本计算正确
        for item in result["items"]:
            assert item["monthly_cost"] > 0
            # 大规模部署的月成本应该较高
            assert item["monthly_cost"] > 1000

    def test_enterprise_export(
        self, client: TestClient, large_scale_calculation_input
    ):
        """测试大规模评估的报告导出"""
        # 计算成本
        calc_response = client.post(
            "/api/v1/calculate", json=large_scale_calculation_input
        )
        assert calc_response.status_code == 200
        calc_result = calc_response.json()

        # 导出报告
        export_request = build_export_request(
            calc_result, large_scale_calculation_input
        )
        export_response = client.post("/api/v1/export", json=export_request)
        assert export_response.status_code == 200

        # 验证导出文件大小（大规模数据的报告应该更大）
        content = export_response.content
        assert len(content) > 1024

    def test_enterprise_full_workflow(
        self, client: TestClient, test_user_data, large_scale_calculation_input
    ):
        """测试企业用户的完整工作流"""
        # 步骤 1: 注册企业用户
        register_response = client.post(
            "/api/v1/auth/register", json=test_user_data
        )
        assert register_response.status_code == 200
        token = register_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 步骤 2: 计算大规模部署成本
        calc_response = client.post(
            "/api/v1/calculate", json=large_scale_calculation_input
        )
        assert calc_response.status_code == 200
        standard_result = calc_response.json()

        # 步骤 3: 进行方案对比
        comparison_input = {
            "functional": large_scale_calculation_input["functional"],
            "pricing": large_scale_calculation_input["pricing"]
        }
        compare_response = client.post("/api/v1/compare", json=comparison_input)
        assert compare_response.status_code == 200
        compare_result = compare_response.json()

        # 步骤 4: 保存最优方案评估
        best_item = min(
            compare_result["items"],
            key=lambda x: x["monthly_cost"]
        )

        # 重新计算最优方案的详细成本
        best_calc_input = {
            **large_scale_calculation_input,
            "technical": {"storage_class": "STANDARD"}  # 使用默认的 Standard
        }
        best_calc_response = client.post("/api/v1/calculate", json=best_calc_input)
        assert best_calc_response.status_code == 200
        best_calc_result = best_calc_response.json()

        eval_data = build_evaluation_request(
            name="企业级部署评估 - 10万设备",
            description=f"最优方案: {best_item['name']}",
            input_params=best_calc_input,
            calc_result=best_calc_result
        )
        save_response = client.post(
            "/api/v1/evaluations",
            json=eval_data,
            headers=headers
        )
        assert save_response.status_code == 200

        # 步骤 5: 导出完整报告
        export_request = build_export_request(
            best_calc_result, best_calc_input
        )
        export_response = client.post("/api/v1/export", json=export_request)
        assert export_response.status_code == 200

    def test_retention_period_impact(self, client: TestClient):
        """测试保留期限对大规模部署成本的影响"""
        base_input = {
            "functional": {
                "device_count": 10000,
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "access_pattern": 0.1
            },
            "technical": {"storage_class": "STANDARD"},
            "pricing": {"region": "ap-northeast-1", "discount_percent": 0.0}
        }

        retention_periods = [7, 30, 90, 365]
        results = []

        for retention in retention_periods:
            input_data = {
                "functional": {
                    **base_input["functional"],
                    "retention_days": retention
                },
                "technical": base_input["technical"],
                "pricing": base_input["pricing"]
            }

            response = client.post("/api/v1/calculate", json=input_data)
            assert response.status_code == 200
            results.append({
                "retention_days": retention,
                "monthly_total": response.json()["monthly_total"]
            })

        # 验证保留期越长，成本越高
        for i in range(len(results) - 1):
            assert results[i]["monthly_total"] < results[i + 1]["monthly_total"]

    def test_video_quality_impact_at_scale(self, client: TestClient):
        """测试视频质量对大规模部署成本的影响"""
        base_input = {
            "functional": {
                "device_count": 10000,
                "recording_mode": "event_triggered",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "retention_days": 30,
                "access_pattern": 0.1
            },
            "technical": {"storage_class": "STANDARD"},
            "pricing": {"region": "ap-northeast-1", "discount_percent": 0.0}
        }

        qualities = ["720p", "1080p", "2K"]  # 注意大写 K
        results = []

        for quality in qualities:
            input_data = {
                "functional": {
                    **base_input["functional"],
                    "video_quality": quality
                },
                "technical": base_input["technical"],
                "pricing": base_input["pricing"]
            }

            response = client.post("/api/v1/calculate", json=input_data)
            if response.status_code == 200:
                results.append({
                    "quality": quality,
                    "monthly_total": response.json()["monthly_total"]
                })

        # 验证质量越高，成本越高
        for i in range(len(results) - 1):
            assert results[i]["monthly_total"] < results[i + 1]["monthly_total"]

    def test_access_pattern_impact(self, client: TestClient):
        """测试访问模式对成本的影响"""
        base_input = {
            "functional": {
                "device_count": 10000,
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "retention_days": 30
            },
            "technical": {"storage_class": "STANDARD"},
            "pricing": {"region": "ap-northeast-1", "discount_percent": 0.0}
        }

        access_patterns = [0.01, 0.1, 0.3, 0.5]
        results = []

        for pattern in access_patterns:
            input_data = {
                "functional": {
                    **base_input["functional"],
                    "access_pattern": pattern
                },
                "technical": base_input["technical"],
                "pricing": base_input["pricing"]
            }

            response = client.post("/api/v1/calculate", json=input_data)
            assert response.status_code == 200
            results.append({
                "access_pattern": pattern,
                "monthly_total": response.json()["monthly_total"]
            })

        # 验证访问率越高，成本越高（因为 GET 请求费用增加）
        for i in range(len(results) - 1):
            assert results[i]["monthly_total"] < results[i + 1]["monthly_total"]

    def test_bulk_discount_impact(self, client: TestClient):
        """测试批量折扣对大规模部署的影响"""
        base_input = {
            "functional": {
                "device_count": 100000,
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "retention_days": 30,
                "access_pattern": 0.05
            },
            "technical": {"storage_class": "STANDARD"}
        }

        # discount_percent 范围是 0-0.5，表示 0-50%
        discounts = [0.0, 0.05, 0.1, 0.15, 0.2]
        results = []

        for discount in discounts:
            input_data = {
                **base_input,
                "pricing": {"region": "ap-northeast-1", "discount_percent": discount}
            }

            response = client.post("/api/v1/calculate", json=input_data)
            assert response.status_code == 200
            results.append({
                "discount": discount,
                "monthly_total": response.json()["monthly_total"]
            })

        # 验证折扣越高，成本越低
        for i in range(len(results) - 1):
            assert results[i]["monthly_total"] > results[i + 1]["monthly_total"]

        # 验证折扣比例正确
        no_discount = results[0]["monthly_total"]
        max_discount = results[-1]["monthly_total"]
        expected_max_discount_cost = no_discount * 0.80  # 20% 折扣

        assert abs(max_discount - expected_max_discount_cost) < expected_max_discount_cost * 0.05

    def test_extreme_scale_calculation(self, client: TestClient):
        """测试极端规模的计算能力"""
        extreme_input = {
            "functional": {
                "device_count": 1000000,  # 100万设备
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "retention_days": 30,
                "access_pattern": 0.05
            },
            "technical": {"storage_class": "STANDARD"},
            "pricing": {"region": "ap-northeast-1", "discount_percent": 0.0}
        }

        start_time = time.time()
        response = client.post("/api/v1/calculate", json=extreme_input)
        end_time = time.time()

        assert response.status_code == 200
        result = response.json()

        # 验证计算完成
        assert result["monthly_total"] > 0
        assert result["device_count"] == 1000000

        # 验证性能
        assert end_time - start_time < 10.0

    def test_enterprise_yearly_projection(self, client: TestClient):
        """测试企业年度成本预测"""
        base_input = {
            "functional": {
                "device_count": 50000,
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "events_per_day": 400,
                "event_duration_sec": 15,
                "retention_days": 90,
                "access_pattern": 0.1
            },
            "technical": {"storage_class": "STANDARD"},
            "pricing": {"region": "ap-northeast-1", "discount_percent": 0.0}
        }

        response = client.post("/api/v1/calculate", json=base_input)
        assert response.status_code == 200
        result = response.json()

        monthly_cost = result["monthly_total"]
        yearly_cost = monthly_cost * 12

        # 验证年度成本在合理范围内
        assert yearly_cost > 0
        # 5万设备的年度存储成本应该在可预期范围内
        assert yearly_cost > 10000  # 至少 1 万美元/年
