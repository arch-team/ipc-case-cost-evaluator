"""定价查询 API 测试"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


class TestPricingAPI:
    """定价查询 API 测试"""

    def test_list_regions(self):
        """测试获取区域列表"""
        response = client.get("/api/v1/pricing/regions")

        assert response.status_code == 200
        data = response.json()
        assert "regions" in data
        assert len(data["regions"]) > 0

    def test_regions_include_tokyo(self):
        """测试区域列表包含东京"""
        response = client.get("/api/v1/pricing/regions")

        assert response.status_code == 200
        regions = response.json()["regions"]
        region_ids = [r["region"] for r in regions]
        assert "ap-northeast-1" in region_ids

    def test_region_has_name(self):
        """测试区域有名称"""
        response = client.get("/api/v1/pricing/regions")

        assert response.status_code == 200
        regions = response.json()["regions"]
        for region in regions:
            assert "region" in region
            assert "name" in region

    def test_get_region_pricing(self):
        """测试获取区域定价"""
        response = client.get("/api/v1/pricing/ap-northeast-1")

        assert response.status_code == 200
        data = response.json()
        assert "region" in data
        assert data["region"] == "ap-northeast-1"

    def test_pricing_has_storage_classes(self):
        """测试定价包含存储类型"""
        response = client.get("/api/v1/pricing/ap-northeast-1")

        assert response.status_code == 200
        data = response.json()
        assert "storage_classes" in data
        assert "STANDARD" in data["storage_classes"]
        assert "GLACIER_IR" in data["storage_classes"]

    def test_storage_class_has_prices(self):
        """测试存储类型包含价格"""
        response = client.get("/api/v1/pricing/ap-northeast-1")

        assert response.status_code == 200
        standard = response.json()["storage_classes"]["STANDARD"]
        assert "storage_per_gb_month" in standard
        assert "put_per_1000" in standard
        assert "get_per_1000" in standard

    def test_pricing_has_data_transfer(self):
        """测试定价包含数据传输"""
        response = client.get("/api/v1/pricing/ap-northeast-1")

        assert response.status_code == 200
        data = response.json()
        assert "data_transfer" in data

    def test_get_invalid_region(self):
        """测试获取无效区域"""
        response = client.get("/api/v1/pricing/invalid-region")

        assert response.status_code == 404

    def test_standard_storage_price(self):
        """测试 Standard 存储价格"""
        response = client.get("/api/v1/pricing/ap-northeast-1")

        assert response.status_code == 200
        standard = response.json()["storage_classes"]["STANDARD"]
        # 东京区域 Standard 存储约 $0.025/GB
        assert standard["storage_per_gb_month"] == pytest.approx(0.025, rel=0.1)

    def test_glacier_storage_price(self):
        """测试 Glacier 存储价格"""
        response = client.get("/api/v1/pricing/ap-northeast-1")

        assert response.status_code == 200
        glacier = response.json()["storage_classes"]["GLACIER_IR"]
        # Glacier IR 存储价格应该比 Standard 低
        standard = response.json()["storage_classes"]["STANDARD"]
        assert glacier["storage_per_gb_month"] < standard["storage_per_gb_month"]


class TestPricingAPIEdgeCases:
    """定价查询 API 边界测试"""

    def test_all_regions_have_pricing(self):
        """测试所有区域都有定价数据"""
        response = client.get("/api/v1/pricing/regions")
        regions = response.json()["regions"]

        for region_info in regions:
            region = region_info["region"]
            pricing_response = client.get(f"/api/v1/pricing/{region}")
            assert pricing_response.status_code == 200

    def test_glacier_has_retrieval_price(self):
        """测试 Glacier 有检索价格"""
        response = client.get("/api/v1/pricing/ap-northeast-1")

        assert response.status_code == 200
        glacier = response.json()["storage_classes"]["GLACIER_IR"]
        assert "retrieval_per_gb" in glacier
        assert glacier["retrieval_per_gb"] > 0

    def test_standard_no_retrieval_price(self):
        """测试 Standard 无检索价格"""
        response = client.get("/api/v1/pricing/ap-northeast-1")

        assert response.status_code == 200
        standard = response.json()["storage_classes"]["STANDARD"]
        assert standard["retrieval_per_gb"] == 0
