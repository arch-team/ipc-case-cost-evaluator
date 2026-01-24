"""Excel 导出 API 测试"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestExportAPI:
    """导出 API 测试"""

    @pytest.fixture
    def sample_request(self):
        """示例请求数据"""
        return {
            "input_data": {
                "functional": {
                    "device_count": 100,
                    "recording_mode": "event_triggered",
                    "video_quality": "1080p",
                    "events_per_day": 400,
                    "event_duration_sec": 15,
                    "retention_days": 30,
                    "access_pattern": 0.1,
                },
                "technical": {
                    "storage_class": "STANDARD",
                },
                "pricing": {
                    "region": "ap-northeast-1",
                    "discount_percent": 0.0,
                },
            },
            "result": {
                "monthly_total": 200.95,
                "per_device_monthly": 2.01,
                "breakdown": {
                    "storage_cost": 134.11,
                    "put_request_cost": 5.64,
                    "get_request_cost": 0.05,
                    "retrieval_cost": 0.0,
                    "data_transfer_cost": 61.15,
                    "lifecycle_cost": 0.0,
                    "total": 200.95,
                },
                "metrics": {
                    "monthly_storage_gb": 5364.42,
                    "monthly_puts": 1200000,
                    "monthly_gets": 120000,
                    "monthly_retrieval_gb": 0.0,
                    "monthly_transfer_gb": 536.44,
                },
                "yearly_total": 2411.43,
                "per_device_yearly": 24.11,
            },
        }

    def test_export_returns_excel_file(self, sample_request):
        """测试导出返回 Excel 文件"""
        response = client.post(
            "/api/v1/export",
            json=sample_request,
        )

        assert response.status_code == 200
        assert (
            response.headers["content-type"]
            == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    def test_export_has_content_disposition(self, sample_request):
        """测试导出有文件名"""
        response = client.post(
            "/api/v1/export",
            json=sample_request,
        )

        assert response.status_code == 200
        assert "content-disposition" in response.headers
        assert "attachment" in response.headers["content-disposition"]
        assert ".xlsx" in response.headers["content-disposition"]

    def test_export_with_custom_title(self, sample_request):
        """测试自定义标题"""
        sample_request["title"] = "测试报告"
        response = client.post(
            "/api/v1/export",
            json=sample_request,
        )

        assert response.status_code == 200

    def test_export_with_comparison(self, sample_request):
        """测试带方案对比"""
        sample_request["comparison"] = {
            "baseline": "S3 Standard",
            "items": [
                {
                    "name": "S3 Standard",
                    "storage_class": "STANDARD",
                    "monthly_cost": 200.95,
                    "yearly_cost": 2411.43,
                    "vs_baseline": 0.0,
                    "is_recommended": False,
                },
                {
                    "name": "S3 Glacier IR",
                    "storage_class": "GLACIER_IR",
                    "monthly_cost": 150.00,
                    "yearly_cost": 1800.00,
                    "vs_baseline": -0.25,
                    "is_recommended": True,
                },
            ],
        }

        response = client.post(
            "/api/v1/export",
            json=sample_request,
        )

        assert response.status_code == 200

    def test_export_invalid_input(self):
        """测试无效输入"""
        response = client.post(
            "/api/v1/export",
            json={"invalid": "data"},
        )

        assert response.status_code == 422

    def test_export_missing_required_fields(self):
        """测试缺少必填字段"""
        response = client.post(
            "/api/v1/export",
            json={"input_data": {}},
        )

        assert response.status_code == 422


class TestExportAPIFilename:
    """导出 API 文件名测试"""

    @pytest.fixture
    def sample_request(self):
        """示例请求数据"""
        return {
            "input_data": {
                "functional": {
                    "device_count": 100,
                },
                "technical": {},
                "pricing": {},
            },
            "result": {
                "monthly_total": 200.0,
                "per_device_monthly": 2.0,
                "breakdown": {
                    "storage_cost": 100.0,
                    "put_request_cost": 50.0,
                    "get_request_cost": 20.0,
                    "retrieval_cost": 0.0,
                    "data_transfer_cost": 30.0,
                    "lifecycle_cost": 0.0,
                    "total": 200.0,
                },
                "metrics": {
                    "monthly_storage_gb": 1000.0,
                    "monthly_puts": 100000,
                    "monthly_gets": 10000,
                    "monthly_retrieval_gb": 0.0,
                    "monthly_transfer_gb": 100.0,
                },
                "yearly_total": 2400.0,
                "per_device_yearly": 24.0,
            },
        }

    def test_export_filename_format(self, sample_request):
        """测试导出文件名格式"""
        response = client.post(
            "/api/v1/export",
            json=sample_request,
        )

        assert response.status_code == 200
        content_disposition = response.headers.get("content-disposition", "")
        # 应该包含日期格式的文件名
        assert "cost_evaluation" in content_disposition.lower() or "ipc" in content_disposition.lower()
