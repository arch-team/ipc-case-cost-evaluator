"""用户认证测试"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.client import get_storage, reset_storage
from app.services.auth import AuthService, verify_password, get_password_hash


client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_storage():
    """每个测试前清理存储"""
    reset_storage()
    storage = get_storage()
    storage.clear_all()
    yield
    storage.clear_all()


class TestPasswordUtils:
    """密码工具测试"""

    def test_password_hash(self):
        """测试密码哈希"""
        password = "test_password"
        hashed = get_password_hash(password)

        assert hashed != password
        assert len(hashed) > 0

    def test_verify_password(self):
        """测试密码验证"""
        password = "test_password"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True
        assert verify_password("wrong_password", hashed) is False


class TestAuthService:
    """认证服务测试"""

    def test_register_user(self):
        """测试用户注册"""
        service = AuthService()
        user = service.register("test@example.com", "password123", "Test User")

        assert user is not None
        assert user["email"] == "test@example.com"
        assert user["name"] == "Test User"
        assert "password" not in user  # 不应返回密码

    def test_register_duplicate_email(self):
        """测试重复邮箱注册"""
        service = AuthService()
        service.register("test@example.com", "password123", "User 1")

        with pytest.raises(ValueError, match="邮箱已注册"):
            service.register("test@example.com", "password456", "User 2")

    def test_authenticate_success(self):
        """测试认证成功"""
        service = AuthService()
        service.register("test@example.com", "password123", "Test User")

        user = service.authenticate("test@example.com", "password123")

        assert user is not None
        assert user["email"] == "test@example.com"

    def test_authenticate_wrong_password(self):
        """测试密码错误"""
        service = AuthService()
        service.register("test@example.com", "password123", "Test User")

        user = service.authenticate("test@example.com", "wrong_password")

        assert user is None

    def test_authenticate_nonexistent_user(self):
        """测试不存在的用户"""
        service = AuthService()

        user = service.authenticate("nonexistent@example.com", "password")

        assert user is None

    def test_create_access_token(self):
        """测试创建访问令牌"""
        service = AuthService()
        token = service.create_access_token({"sub": "user_id"})

        assert token is not None
        assert len(token) > 0

    def test_verify_token(self):
        """测试验证令牌"""
        service = AuthService()
        token = service.create_access_token({"sub": "user_id"})

        payload = service.verify_token(token)

        assert payload is not None
        assert payload["sub"] == "user_id"

    def test_verify_invalid_token(self):
        """测试验证无效令牌"""
        service = AuthService()

        payload = service.verify_token("invalid_token")

        assert payload is None

    def test_get_user_by_id(self):
        """测试按 ID 获取用户"""
        service = AuthService()
        user = service.register("test@example.com", "password123", "Test User")
        user_id = user["id"]

        fetched = service.get_user_by_id(user_id)

        assert fetched is not None
        assert fetched["email"] == "test@example.com"


class TestAuthAPI:
    """认证 API 测试"""

    def test_register_api(self):
        """测试注册 API"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "password123",
                "name": "Test User",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_register_invalid_email(self):
        """测试无效邮箱注册"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "invalid_email",
                "password": "password123",
                "name": "Test User",
            },
        )

        assert response.status_code == 422

    def test_login_api(self):
        """测试登录 API"""
        # 先注册
        client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "password123",
                "name": "Test User",
            },
        )

        # 登录
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "password123",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    def test_login_wrong_password(self):
        """测试密码错误登录"""
        # 先注册
        client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "password123",
                "name": "Test User",
            },
        )

        # 登录
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "wrong_password",
            },
        )

        assert response.status_code == 401

    def test_get_current_user(self):
        """测试获取当前用户"""
        # 先注册
        register_response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "password123",
                "name": "Test User",
            },
        )
        token = register_response.json()["access_token"]

        # 获取当前用户
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"

    def test_get_current_user_no_token(self):
        """测试无令牌获取当前用户"""
        response = client.get("/api/v1/auth/me")

        assert response.status_code == 401

    def test_get_current_user_invalid_token(self):
        """测试无效令牌获取当前用户"""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token"},
        )

        assert response.status_code == 401
