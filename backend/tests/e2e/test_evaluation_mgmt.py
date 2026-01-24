"""
场景 4：用户评估记录管理
用户故事：老用户管理历史评估记录

测试流程：登录 → 列出评估 → 查看详情 → 更新评估 → 删除评估
"""
import pytest
from fastapi.testclient import TestClient

from tests.e2e.conftest import build_evaluation_request


class TestEvaluationManagement:
    """用户评估记录管理流程 E2E 测试"""

    def test_complete_crud_cycle(
        self, client: TestClient, auth_headers, basic_calculation_input
    ):
        """测试完整的 CRUD 操作周期"""
        # 步骤 1: 创建评估
        calc_response = client.post(
            "/api/v1/calculate", json=basic_calculation_input
        )
        assert calc_response.status_code == 200
        calc_result = calc_response.json()

        eval_data = build_evaluation_request(
            name="CRUD 测试评估",
            description="用于测试完整 CRUD 流程",
            input_params=basic_calculation_input,
            calc_result=calc_result
        )
        create_response = client.post(
            "/api/v1/evaluations",
            json=eval_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        eval_id = create_response.json()["id"]

        # 步骤 2: 列出评估
        list_response = client.get("/api/v1/evaluations", headers=auth_headers)
        assert list_response.status_code == 200
        evaluations = list_response.json()["evaluations"]
        assert len(evaluations) == 1
        assert evaluations[0]["id"] == eval_id

        # 步骤 3: 查看详情
        detail_response = client.get(
            f"/api/v1/evaluations/{eval_id}", headers=auth_headers
        )
        assert detail_response.status_code == 200
        detail = detail_response.json()
        assert detail["name"] == "CRUD 测试评估"

        # 步骤 4: 更新评估
        update_response = client.put(
            f"/api/v1/evaluations/{eval_id}",
            json={"name": "更新后的评估名称"},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["name"] == "更新后的评估名称"

        # 步骤 5: 验证更新成功
        verify_response = client.get(
            f"/api/v1/evaluations/{eval_id}", headers=auth_headers
        )
        assert verify_response.status_code == 200
        assert verify_response.json()["name"] == "更新后的评估名称"

        # 步骤 6: 删除评估
        delete_response = client.delete(
            f"/api/v1/evaluations/{eval_id}", headers=auth_headers
        )
        assert delete_response.status_code == 200

        # 步骤 7: 验证删除成功
        get_deleted_response = client.get(
            f"/api/v1/evaluations/{eval_id}", headers=auth_headers
        )
        assert get_deleted_response.status_code == 404

    def test_user_isolation(
        self,
        client: TestClient,
        auth_headers,
        second_auth_headers,
        basic_calculation_input
    ):
        """验证用户只能访问自己的评估"""
        # 用户 1 创建评估
        calc_response = client.post(
            "/api/v1/calculate", json=basic_calculation_input
        )
        calc_result = calc_response.json()

        eval_data = build_evaluation_request(
            name="用户1的评估",
            description="属于用户1",
            input_params=basic_calculation_input,
            calc_result=calc_result
        )
        create_response = client.post(
            "/api/v1/evaluations",
            json=eval_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        user1_eval_id = create_response.json()["id"]

        # 用户 2 尝试访问用户 1 的评估
        get_response = client.get(
            f"/api/v1/evaluations/{user1_eval_id}", headers=second_auth_headers
        )
        # 应该返回 404（找不到）或 403（禁止访问）
        assert get_response.status_code in [403, 404]

        # 用户 2 列出评估，不应看到用户 1 的评估
        list_response = client.get(
            "/api/v1/evaluations", headers=second_auth_headers
        )
        assert list_response.status_code == 200
        user2_evaluations = list_response.json()["evaluations"]
        user2_eval_ids = [e["id"] for e in user2_evaluations]
        assert user1_eval_id not in user2_eval_ids

        # 用户 2 尝试删除用户 1 的评估
        delete_response = client.delete(
            f"/api/v1/evaluations/{user1_eval_id}", headers=second_auth_headers
        )
        assert delete_response.status_code in [403, 404]

        # 验证用户 1 的评估仍然存在
        verify_response = client.get(
            f"/api/v1/evaluations/{user1_eval_id}", headers=auth_headers
        )
        assert verify_response.status_code == 200

    def test_multiple_evaluations_management(
        self, client: TestClient, auth_headers, basic_calculation_input
    ):
        """测试多个评估的管理"""
        # 创建多个评估
        eval_ids = []
        for i in range(5):
            input_params = {
                "functional": {
                    **basic_calculation_input["functional"],
                    "device_count": (i + 1) * 100
                },
                "technical": basic_calculation_input["technical"],
                "pricing": basic_calculation_input["pricing"]
            }

            calc_response = client.post("/api/v1/calculate", json=input_params)
            calc_result = calc_response.json()

            eval_data = build_evaluation_request(
                name=f"评估 #{i + 1}",
                description=f"设备数量: {(i + 1) * 100}",
                input_params=input_params,
                calc_result=calc_result
            )
            create_response = client.post(
                "/api/v1/evaluations",
                json=eval_data,
                headers=auth_headers
            )
            assert create_response.status_code == 200
            eval_ids.append(create_response.json()["id"])

        # 验证列表包含所有评估
        list_response = client.get("/api/v1/evaluations", headers=auth_headers)
        assert list_response.status_code == 200
        evaluations = list_response.json()["evaluations"]
        assert len(evaluations) == 5

        # 删除中间的评估
        delete_response = client.delete(
            f"/api/v1/evaluations/{eval_ids[2]}", headers=auth_headers
        )
        assert delete_response.status_code == 200

        # 验证只剩 4 个评估
        list_response = client.get("/api/v1/evaluations", headers=auth_headers)
        assert list_response.status_code == 200
        evaluations = list_response.json()["evaluations"]
        assert len(evaluations) == 4

        # 验证删除的评估不在列表中
        remaining_ids = [e["id"] for e in evaluations]
        assert eval_ids[2] not in remaining_ids

    def test_unauthorized_access(
        self, client: TestClient, basic_calculation_input
    ):
        """测试未认证用户无法访问评估端点"""
        # 尝试列出评估（无认证）
        list_response = client.get("/api/v1/evaluations")
        assert list_response.status_code == 401

        # 尝试创建评估（无认证）
        calc_response = client.post(
            "/api/v1/calculate", json=basic_calculation_input
        )
        calc_result = calc_response.json()

        eval_data = build_evaluation_request(
            name="未授权测试",
            description="不应该成功",
            input_params=basic_calculation_input,
            calc_result=calc_result
        )
        create_response = client.post(
            "/api/v1/evaluations",
            json=eval_data
        )
        assert create_response.status_code == 401

    def test_invalid_token_access(
        self, client: TestClient, basic_calculation_input
    ):
        """测试无效 token 无法访问评估端点"""
        invalid_headers = {"Authorization": "Bearer invalid_token_12345"}

        list_response = client.get(
            "/api/v1/evaluations", headers=invalid_headers
        )
        assert list_response.status_code == 401

    def test_evaluation_update_partial(
        self, client: TestClient, auth_headers, basic_calculation_input
    ):
        """测试评估的部分更新"""
        # 创建评估
        calc_response = client.post(
            "/api/v1/calculate", json=basic_calculation_input
        )
        calc_result = calc_response.json()

        eval_data = build_evaluation_request(
            name="原始名称",
            description="原始描述",
            input_params=basic_calculation_input,
            calc_result=calc_result
        )
        create_response = client.post(
            "/api/v1/evaluations",
            json=eval_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        eval_id = create_response.json()["id"]

        # 只更新名称
        update_response = client.put(
            f"/api/v1/evaluations/{eval_id}",
            json={"name": "新名称"},
            headers=auth_headers
        )
        assert update_response.status_code == 200

        # 验证名称已更新，描述保持不变
        detail_response = client.get(
            f"/api/v1/evaluations/{eval_id}", headers=auth_headers
        )
        detail = detail_response.json()
        assert detail["name"] == "新名称"
        assert detail["description"] == "原始描述"

    def test_login_and_manage_evaluations(
        self, client: TestClient, test_user_data, basic_calculation_input
    ):
        """测试登录后管理评估的完整流程"""
        # 注册用户
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

        # 创建评估
        calc_response = client.post(
            "/api/v1/calculate", json=basic_calculation_input
        )
        calc_result = calc_response.json()

        eval_data = build_evaluation_request(
            name="登录后创建的评估",
            description="测试登录流程",
            input_params=basic_calculation_input,
            calc_result=calc_result
        )
        create_response = client.post(
            "/api/v1/evaluations",
            json=eval_data,
            headers=headers
        )
        assert create_response.status_code == 200
        eval_id = create_response.json()["id"]

        # 查看评估
        get_response = client.get(
            f"/api/v1/evaluations/{eval_id}", headers=headers
        )
        assert get_response.status_code == 200
        assert get_response.json()["name"] == "登录后创建的评估"

    def test_evaluation_not_found(self, client: TestClient, auth_headers):
        """测试访问不存在的评估"""
        response = client.get(
            "/api/v1/evaluations/nonexistent-id-12345",
            headers=auth_headers
        )
        assert response.status_code == 404

    def test_delete_nonexistent_evaluation(
        self, client: TestClient, auth_headers
    ):
        """测试删除不存在的评估"""
        response = client.delete(
            "/api/v1/evaluations/nonexistent-id-12345",
            headers=auth_headers
        )
        assert response.status_code == 404
