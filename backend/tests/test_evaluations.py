"""评估记录测试"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.client import get_storage, reset_storage
from app.db.repositories.evaluations import EvaluationRepository
from app.services.auth import AuthService
from app.models.enums import UserRole


client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_storage():
    """每个测试前清理存储"""
    reset_storage()
    storage = get_storage()
    storage.clear_all()
    yield
    storage.clear_all()


@pytest.fixture
def auth_token():
    """创建测试用户并获取令牌"""
    service = AuthService()
    user = service.register("test@example.com", "password123", "Test User")
    token = service.create_access_token(user["id"], UserRole.USER)
    return token, user["id"]


class TestEvaluationRepository:
    """评估记录仓库测试"""

    def test_create_evaluation(self):
        """测试创建评估"""
        repo = EvaluationRepository()
        evaluation = repo.create(
            user_id="user1",
            name="测试评估",
            input_data={"device_count": 100},
            result={"monthly_total": 1000},
        )

        assert evaluation is not None
        assert evaluation["name"] == "测试评估"
        assert evaluation["user_id"] == "user1"
        assert "id" in evaluation
        assert "created_at" in evaluation

    def test_get_evaluation(self):
        """测试获取评估"""
        repo = EvaluationRepository()
        created = repo.create(
            user_id="user1",
            name="测试评估",
            input_data={"device_count": 100},
            result={"monthly_total": 1000},
        )

        evaluation = repo.get(created["id"])

        assert evaluation is not None
        assert evaluation["id"] == created["id"]

    def test_get_nonexistent(self):
        """测试获取不存在的评估"""
        repo = EvaluationRepository()
        evaluation = repo.get("nonexistent")

        assert evaluation is None

    def test_list_by_user(self):
        """测试按用户列出评估"""
        repo = EvaluationRepository()
        repo.create(
            user_id="user1",
            name="评估1",
            input_data={},
            result={},
        )
        repo.create(
            user_id="user1",
            name="评估2",
            input_data={},
            result={},
        )
        repo.create(
            user_id="user2",
            name="评估3",
            input_data={},
            result={},
        )

        user1_evals = repo.list_by_user("user1")
        user2_evals = repo.list_by_user("user2")

        assert len(user1_evals) == 2
        assert len(user2_evals) == 1

    def test_update_evaluation(self):
        """测试更新评估"""
        repo = EvaluationRepository()
        created = repo.create(
            user_id="user1",
            name="原始名称",
            input_data={},
            result={},
        )

        updated = repo.update(created["id"], name="新名称")

        assert updated is not None
        assert updated["name"] == "新名称"

    def test_delete_evaluation(self):
        """测试删除评估"""
        repo = EvaluationRepository()
        created = repo.create(
            user_id="user1",
            name="测试评估",
            input_data={},
            result={},
        )

        result = repo.delete(created["id"])
        evaluation = repo.get(created["id"])

        assert result is True
        assert evaluation is None


class TestEvaluationsAPI:
    """评估记录 API 测试"""

    def test_create_evaluation(self, auth_token):
        """测试创建评估 API"""
        token, _ = auth_token
        response = client.post(
            "/api/v1/evaluations",
            json={
                "name": "测试评估",
                "input_data": {
                    "functional": {"device_count": 100},
                },
                "result": {"monthly_total": 1000},
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "测试评估"
        assert "id" in data

    def test_create_evaluation_no_auth(self):
        """测试未认证创建评估"""
        response = client.post(
            "/api/v1/evaluations",
            json={
                "name": "测试评估",
                "input_data": {},
                "result": {},
            },
        )

        assert response.status_code == 401

    def test_list_evaluations(self, auth_token):
        """测试列出评估 API"""
        token, _ = auth_token

        # 创建两个评估
        client.post(
            "/api/v1/evaluations",
            json={"name": "评估1", "input_data": {}, "result": {}},
            headers={"Authorization": f"Bearer {token}"},
        )
        client.post(
            "/api/v1/evaluations",
            json={"name": "评估2", "input_data": {}, "result": {}},
            headers={"Authorization": f"Bearer {token}"},
        )

        response = client.get(
            "/api/v1/evaluations",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["evaluations"]) == 2

    def test_get_evaluation(self, auth_token):
        """测试获取单个评估 API"""
        token, _ = auth_token

        # 创建评估
        create_response = client.post(
            "/api/v1/evaluations",
            json={"name": "测试评估", "input_data": {}, "result": {}},
            headers={"Authorization": f"Bearer {token}"},
        )
        eval_id = create_response.json()["id"]

        response = client.get(
            f"/api/v1/evaluations/{eval_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == eval_id

    def test_get_evaluation_not_found(self, auth_token):
        """测试获取不存在的评估"""
        token, _ = auth_token
        response = client.get(
            "/api/v1/evaluations/nonexistent",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404

    def test_delete_evaluation(self, auth_token):
        """测试删除评估 API"""
        token, _ = auth_token

        # 创建评估
        create_response = client.post(
            "/api/v1/evaluations",
            json={"name": "测试评估", "input_data": {}, "result": {}},
            headers={"Authorization": f"Bearer {token}"},
        )
        eval_id = create_response.json()["id"]

        # 删除
        response = client.delete(
            f"/api/v1/evaluations/{eval_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200

        # 验证已删除
        get_response = client.get(
            f"/api/v1/evaluations/{eval_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert get_response.status_code == 404

    def test_update_evaluation(self, auth_token):
        """测试更新评估 API"""
        token, _ = auth_token

        # 创建评估
        create_response = client.post(
            "/api/v1/evaluations",
            json={"name": "原始名称", "input_data": {}, "result": {}},
            headers={"Authorization": f"Bearer {token}"},
        )
        eval_id = create_response.json()["id"]

        # 更新
        response = client.put(
            f"/api/v1/evaluations/{eval_id}",
            json={"name": "新名称"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "新名称"
