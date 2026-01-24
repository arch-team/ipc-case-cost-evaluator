"""分享 API 集成测试"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.client import reset_storage


class TestShareAPI:
    """分享 API 测试"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """每个测试前重置存储"""
        reset_storage()

    @pytest.fixture
    def client(self):
        return TestClient(app)

    @pytest.fixture
    def auth_header(self, client):
        """创建认证用户并返回认证头"""
        # 注册用户
        client.post("/api/v1/auth/register", json={
            "email": "test@example.com",
            "password": "password123",
            "name": "测试用户"
        })
        # 登录获取 token
        response = client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    @pytest.fixture
    def sample_evaluation(self, client, auth_header):
        """创建示例评估"""
        response = client.post(
            "/api/v1/evaluations",
            json={
                "name": "测试评估",
                "description": "测试描述",
                "input_data": {
                    "functional": {"device_count": 100},
                    "technical": {"storage_class": "STANDARD"},
                    "pricing": {"region": "ap-northeast-1"}
                },
                "result": {"monthly_total": 100.0}
            },
            headers=auth_header
        )
        return response.json()

    def test_create_share(self, client, auth_header, sample_evaluation):
        """测试创建分享"""
        eval_id = sample_evaluation["id"]
        response = client.post(
            f"/api/v1/evaluations/{eval_id}/share",
            json={"permission": "VIEW", "expires_days": 7},
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert "share_token" in data
        assert "share_url" in data
        assert data["permission"] == "VIEW"

    def test_create_share_duplicate_permission(self, client, auth_header, sample_evaluation):
        """测试创建可复制权限的分享"""
        eval_id = sample_evaluation["id"]
        response = client.post(
            f"/api/v1/evaluations/{eval_id}/share",
            json={"permission": "DUPLICATE", "expires_days": 30},
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert data["permission"] == "DUPLICATE"

    def test_create_share_default_values(self, client, auth_header, sample_evaluation):
        """测试创建分享使用默认值"""
        eval_id = sample_evaluation["id"]
        response = client.post(
            f"/api/v1/evaluations/{eval_id}/share",
            json={},
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert data["permission"] == "VIEW"

    def test_create_share_nonexistent_evaluation(self, client, auth_header):
        """测试为不存在的评估创建分享"""
        response = client.post(
            "/api/v1/evaluations/nonexistent-id/share",
            json={"permission": "VIEW"},
            headers=auth_header
        )
        assert response.status_code == 404

    def test_create_share_unauthorized(self, client, sample_evaluation):
        """测试未认证创建分享"""
        eval_id = sample_evaluation["id"]
        response = client.post(
            f"/api/v1/evaluations/{eval_id}/share",
            json={"permission": "VIEW"}
        )
        assert response.status_code == 401

    def test_get_shared_evaluation(self, client, auth_header, sample_evaluation):
        """测试获取分享内容 (公开接口)"""
        eval_id = sample_evaluation["id"]
        # 创建分享
        share_response = client.post(
            f"/api/v1/evaluations/{eval_id}/share",
            json={"permission": "VIEW"},
            headers=auth_header
        )
        token = share_response.json()["share_token"]

        # 获取分享内容 (公开接口，无需认证)
        response = client.get(f"/api/v1/shared/{token}")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "测试评估"
        assert data["evaluation_id"] == eval_id
        assert data["permission"] == "VIEW"

    def test_get_invalid_token(self, client):
        """测试获取无效 token"""
        response = client.get("/api/v1/shared/invalid-token")
        assert response.status_code == 404

    def test_delete_share(self, client, auth_header, sample_evaluation):
        """测试删除分享"""
        eval_id = sample_evaluation["id"]
        share_response = client.post(
            f"/api/v1/evaluations/{eval_id}/share",
            json={"permission": "VIEW"},
            headers=auth_header
        )
        token = share_response.json()["share_token"]

        response = client.delete(
            f"/api/v1/evaluations/{eval_id}/share/{token}",
            headers=auth_header
        )
        assert response.status_code == 200

        # 验证已删除
        response = client.get(f"/api/v1/shared/{token}")
        assert response.status_code == 404

    def test_delete_nonexistent_share(self, client, auth_header, sample_evaluation):
        """测试删除不存在的分享"""
        eval_id = sample_evaluation["id"]
        response = client.delete(
            f"/api/v1/evaluations/{eval_id}/share/nonexistent-token",
            headers=auth_header
        )
        assert response.status_code == 404

    def test_list_evaluation_shares(self, client, auth_header, sample_evaluation):
        """测试列出评估的所有分享"""
        eval_id = sample_evaluation["id"]
        # 创建多个分享
        client.post(
            f"/api/v1/evaluations/{eval_id}/share",
            json={"permission": "VIEW"},
            headers=auth_header
        )
        client.post(
            f"/api/v1/evaluations/{eval_id}/share",
            json={"permission": "DUPLICATE"},
            headers=auth_header
        )

        response = client.get(
            f"/api/v1/evaluations/{eval_id}/shares",
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["shares"]) == 2
