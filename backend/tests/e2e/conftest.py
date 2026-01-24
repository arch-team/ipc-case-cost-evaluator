"""
E2E 测试共享 fixtures
提供认证、测试客户端和数据清理等公共功能
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.client import get_storage, reset_storage


@pytest.fixture
def client():
    """创建测试客户端"""
    return TestClient(app)


@pytest.fixture(autouse=True)
def clean_storage():
    """每个测试前后清理存储"""
    reset_storage()
    storage = get_storage()
    storage.clear_all()
    yield
    storage.clear_all()


@pytest.fixture
def test_user_data():
    """测试用户数据"""
    return {
        "email": "e2e_test@example.com",
        "password": "TestPassword123!",
        "name": "E2E 测试用户"
    }


@pytest.fixture
def second_user_data():
    """第二个测试用户数据（用于隔离性测试）"""
    return {
        "email": "e2e_test2@example.com",
        "password": "TestPassword456!",
        "name": "E2E 测试用户2"
    }


@pytest.fixture
def auth_headers(client, test_user_data):
    """注册用户并返回认证头"""
    response = client.post("/api/v1/auth/register", json=test_user_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def second_auth_headers(client, second_user_data):
    """第二个用户的认证头"""
    response = client.post("/api/v1/auth/register", json=second_user_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def basic_calculation_input():
    """基础成本计算输入"""
    return {
        "functional": {
            "device_count": 100,
            "recording_mode": "event_triggered",
            "video_quality": "1080p",
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


@pytest.fixture
def large_scale_calculation_input():
    """大规模部署计算输入（10万设备）"""
    return {
        "functional": {
            "device_count": 100000,
            "recording_mode": "event_triggered",
            "video_quality": "1080p",
            "events_per_day": 400,
            "event_duration_sec": 15,
            "retention_days": 30,
            "access_pattern": 0.05
        },
        "technical": {
            "storage_class": "STANDARD"
        },
        "pricing": {
            "region": "ap-northeast-1",
            "discount_percent": 0.0
        }
    }


@pytest.fixture
def glacier_calculation_input():
    """Glacier IR 存储计算输入"""
    return {
        "functional": {
            "device_count": 100,
            "recording_mode": "event_triggered",
            "video_quality": "1080p",
            "events_per_day": 400,
            "event_duration_sec": 15,
            "retention_days": 30,
            "access_pattern": 0.05  # 低访问率
        },
        "technical": {
            "storage_class": "GLACIER_IR"
        },
        "pricing": {
            "region": "ap-northeast-1",
            "discount_percent": 0.0
        }
    }


@pytest.fixture
def comparison_input():
    """存储方案对比输入"""
    return {
        "functional": {
            "device_count": 1000,
            "recording_mode": "event_triggered",
            "video_quality": "1080p",
            "events_per_day": 400,
            "event_duration_sec": 15,
            "retention_days": 30,
            "access_pattern": 0.1
        },
        "pricing": {
            "region": "ap-northeast-1",
            "discount_percent": 0.0
        }
    }


def register_and_get_token(client, user_data):
    """辅助函数：注册用户并获取 token"""
    response = client.post("/api/v1/auth/register", json=user_data)
    return response.json()["access_token"] if response.status_code == 200 else None


def login_and_get_token(client, email, password):
    """辅助函数：登录并获取 token（使用 JSON body）"""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password}
    )
    return response.json()["access_token"] if response.status_code == 200 else None


def build_export_request(calc_result, input_params):
    """构建导出请求"""
    # 默认技术和价格配置
    default_technical = {"storage_class": "STANDARD"}
    default_pricing = {"region": "ap-northeast-1", "discount_percent": 0.0}

    # 从计算结果中提取月度成本
    monthly_total = calc_result["monthly_total"]
    per_device_monthly = calc_result["per_device_monthly"]

    return {
        "input_data": {
            "functional": input_params["functional"],
            "technical": input_params.get("technical", default_technical),
            "pricing": input_params.get("pricing", default_pricing)
        },
        "result": {
            "monthly_total": monthly_total,
            "per_device_monthly": per_device_monthly,
            "yearly_total": calc_result.get("yearly_total", monthly_total * 12),
            "per_device_yearly": calc_result.get("per_device_yearly", per_device_monthly * 12),
            "breakdown": {
                "storage_cost": calc_result["breakdown"]["storage_cost"],
                "put_request_cost": calc_result["breakdown"]["put_request_cost"],
                "get_request_cost": calc_result["breakdown"]["get_request_cost"],
                "retrieval_cost": calc_result["breakdown"].get("retrieval_cost", 0.0),
                "data_transfer_cost": calc_result["breakdown"].get("data_transfer_cost", 0.0),
                "lifecycle_cost": calc_result["breakdown"].get("lifecycle_cost", 0.0),
                "total": monthly_total
            },
            "metrics": {
                "monthly_storage_gb": calc_result["metrics"]["avg_storage_gb"],
                "monthly_puts": calc_result["metrics"]["monthly_puts"],
                "monthly_gets": calc_result["metrics"]["monthly_gets"],
                "monthly_retrieval_gb": calc_result["metrics"].get("monthly_retrieval_gb", 0.0),
                "monthly_transfer_gb": calc_result["metrics"].get("monthly_transfer_gb", 0.0)
            }
        }
    }


def build_evaluation_request(name, description, input_params, calc_result):
    """构建评估创建请求"""
    return {
        "name": name,
        "description": description,
        "input_data": input_params,
        "result": calc_result
    }
