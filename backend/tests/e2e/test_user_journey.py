"""
场景 1：新用户完整评估流程
用户故事：新用户注册后，进行首次成本评估并保存

测试流程：注册 → 获取 Token → 成本计算 → 保存评估 → 查看评估 → 导出报告
"""
import pytest
from fastapi.testclient import TestClient

from tests.e2e.conftest import build_export_request, build_evaluation_request


class TestNewUserJourney:
    """新用户完整评估流程 E2E 测试"""

    def test_complete_first_evaluation(
        self, client: TestClient, test_user_data, basic_calculation_input
    ):
        """测试完整的首次评估流程"""
        # 步骤 1: 新用户注册
        register_response = client.post(
            "/api/v1/auth/register", json=test_user_data
        )
        assert register_response.status_code == 200
        token = register_response.json()["access_token"]
        assert token is not None
        headers = {"Authorization": f"Bearer {token}"}

        # 步骤 2: 验证用户信息
        me_response = client.get("/api/v1/auth/me", headers=headers)
        assert me_response.status_code == 200
        assert me_response.json()["email"] == test_user_data["email"]

        # 步骤 3: 进行成本计算
        calc_response = client.post(
            "/api/v1/calculate", json=basic_calculation_input
        )
        assert calc_response.status_code == 200
        calc_result = calc_response.json()

        # 验证计算结果结构
        assert "monthly_total" in calc_result
        assert "per_device_monthly" in calc_result
        assert "breakdown" in calc_result
        assert calc_result["monthly_total"] > 0

        # 步骤 4: 保存评估记录
        evaluation_data = build_evaluation_request(
            name="首次评估 - 100 台设备",
            description="测试 100 台设备的存储成本",
            input_params=basic_calculation_input,
            calc_result=calc_result
        )
        save_response = client.post(
            "/api/v1/evaluations", json=evaluation_data, headers=headers
        )
        assert save_response.status_code == 200
        saved_eval = save_response.json()
        eval_id = saved_eval["id"]

        # 步骤 5: 查看保存的评估
        get_response = client.get(
            f"/api/v1/evaluations/{eval_id}", headers=headers
        )
        assert get_response.status_code == 200
        retrieved_eval = get_response.json()
        assert retrieved_eval["name"] == evaluation_data["name"]

        # 步骤 6: 导出 Excel 报告
        export_request = build_export_request(calc_result, basic_calculation_input)
        export_response = client.post("/api/v1/export", json=export_request)
        assert export_response.status_code == 200
        assert export_response.headers["content-type"] == \
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    def test_evaluation_data_integrity(
        self, client: TestClient, auth_headers, basic_calculation_input
    ):
        """验证保存的评估与原始输入/结果一致"""
        # 计算成本
        calc_response = client.post(
            "/api/v1/calculate", json=basic_calculation_input
        )
        assert calc_response.status_code == 200
        original_result = calc_response.json()

        # 保存评估
        evaluation_data = build_evaluation_request(
            name="数据完整性测试",
            description="验证数据完整性",
            input_params=basic_calculation_input,
            calc_result=original_result
        )
        save_response = client.post(
            "/api/v1/evaluations", json=evaluation_data, headers=auth_headers
        )
        assert save_response.status_code == 200
        eval_id = save_response.json()["id"]

        # 获取保存的评估
        get_response = client.get(
            f"/api/v1/evaluations/{eval_id}", headers=auth_headers
        )
        assert get_response.status_code == 200
        retrieved_eval = get_response.json()

        # 验证输入参数完全一致
        functional = retrieved_eval["input_data"]["functional"]
        expected_functional = basic_calculation_input["functional"]
        assert functional["device_count"] == expected_functional["device_count"]

        technical = retrieved_eval["input_data"]["technical"]
        expected_technical = basic_calculation_input["technical"]
        assert technical["storage_class"] == expected_technical["storage_class"]

        pricing = retrieved_eval["input_data"]["pricing"]
        expected_pricing = basic_calculation_input["pricing"]
        assert pricing["region"] == expected_pricing["region"]

        # 验证结果数据完全一致
        result = retrieved_eval["result"]
        assert result["monthly_total"] == original_result["monthly_total"]
        assert result["per_device_monthly"] == original_result["per_device_monthly"]

    def test_export_matches_calculation(
        self, client: TestClient, basic_calculation_input
    ):
        """验证导出报告与计算结果一致"""
        # 计算成本
        calc_response = client.post(
            "/api/v1/calculate", json=basic_calculation_input
        )
        assert calc_response.status_code == 200
        calc_result = calc_response.json()

        # 导出报告
        export_request = build_export_request(calc_result, basic_calculation_input)
        export_response = client.post("/api/v1/export", json=export_request)
        assert export_response.status_code == 200

        # 验证返回的是有效的 Excel 文件
        content = export_response.content
        EXCEL_MAGIC_NUMBER = b'PK'  # Excel 文件的魔数（PK zip 格式）
        MIN_EXCEL_SIZE = 1024  # 文件大小应该合理（至少 1KB）

        assert content[:2] == EXCEL_MAGIC_NUMBER
        assert len(content) > MIN_EXCEL_SIZE

    def test_register_login_calculate_flow(
        self, client: TestClient, test_user_data, basic_calculation_input
    ):
        """测试注册 → 登录 → 计算的完整流程"""
        # 注册
        register_response = client.post(
            "/api/v1/auth/register", json=test_user_data
        )
        assert register_response.status_code == 200

        # 登录（使用 JSON body）
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 验证登录后可以访问受保护的端点
        me_response = client.get("/api/v1/auth/me", headers=headers)
        assert me_response.status_code == 200

        # 计算成本
        calc_response = client.post(
            "/api/v1/calculate", json=basic_calculation_input
        )
        assert calc_response.status_code == 200
        assert calc_response.json()["monthly_total"] > 0

    def test_multiple_evaluations_in_session(
        self, client: TestClient, auth_headers, basic_calculation_input
    ):
        """测试用户在单个会话中创建多个评估"""
        evaluation_names = [
            "评估 1 - 小规模",
            "评估 2 - 中规模",
            "评估 3 - 大规模"
        ]
        device_counts = [10, 100, 1000]
        created_ids = []

        for name, device_count in zip(evaluation_names, device_counts):
            # 修改设备数量
            input_params = {
                "functional": {
                    **basic_calculation_input["functional"],
                    "device_count": device_count
                },
                "technical": basic_calculation_input["technical"],
                "pricing": basic_calculation_input["pricing"]
            }

            # 计算成本
            calc_response = client.post("/api/v1/calculate", json=input_params)
            assert calc_response.status_code == 200
            calc_result = calc_response.json()

            # 保存评估
            eval_data = build_evaluation_request(
                name=name,
                description=f"设备数量: {device_count}",
                input_params=input_params,
                calc_result=calc_result
            )
            save_response = client.post(
                "/api/v1/evaluations",
                json=eval_data,
                headers=auth_headers
            )
            assert save_response.status_code == 200
            created_ids.append(save_response.json()["id"])

        # 验证所有评估都已创建
        list_response = client.get("/api/v1/evaluations", headers=auth_headers)
        assert list_response.status_code == 200
        evaluations = list_response.json()["evaluations"]
        assert len(evaluations) == 3

        # 验证评估名称正确
        saved_names = [e["name"] for e in evaluations]
        for name in evaluation_names:
            assert name in saved_names
