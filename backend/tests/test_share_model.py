"""分享模型单元测试"""
import pytest
from datetime import datetime, timezone, timedelta
from pydantic import ValidationError

from app.models.share import Share, ShareCreate, ShareResponse, SharedEvaluation
from app.models.enums import SharePermission


class TestShareModel:
    """分享模型测试"""

    def test_share_create_valid(self):
        """测试有效的分享创建请求"""
        data = ShareCreate(
            permission=SharePermission.VIEW,
            expires_days=7
        )
        assert data.permission == SharePermission.VIEW
        assert data.expires_days == 7

    def test_share_create_default_expires(self):
        """测试默认过期天数"""
        data = ShareCreate(permission=SharePermission.VIEW)
        assert data.expires_days == 7  # 默认7天

    def test_share_create_default_permission(self):
        """测试默认权限"""
        data = ShareCreate()
        assert data.permission == SharePermission.VIEW
        assert data.expires_days == 7

    def test_share_create_invalid_expires_zero(self):
        """测试无效的过期天数 (0)"""
        with pytest.raises(ValidationError):
            ShareCreate(permission=SharePermission.VIEW, expires_days=0)

    def test_share_create_invalid_expires_negative(self):
        """测试无效的过期天数 (负数)"""
        with pytest.raises(ValidationError):
            ShareCreate(permission=SharePermission.VIEW, expires_days=-1)

    def test_share_create_invalid_expires_too_large(self):
        """测试无效的过期天数 (超过365)"""
        with pytest.raises(ValidationError):
            ShareCreate(permission=SharePermission.VIEW, expires_days=400)

    def test_share_create_duplicate_permission(self):
        """测试复制权限"""
        data = ShareCreate(
            permission=SharePermission.DUPLICATE,
            expires_days=30
        )
        assert data.permission == SharePermission.DUPLICATE

    def test_share_response(self):
        """测试分享响应模型"""
        now = datetime.now(timezone.utc)
        expires = now + timedelta(days=7)
        response = ShareResponse(
            share_token="test-token-123",
            share_url="https://example.com/shared/test-token-123",
            permission=SharePermission.VIEW,
            expires_at=expires,
            created_at=now
        )
        assert response.share_token == "test-token-123"
        assert response.share_url == "https://example.com/shared/test-token-123"
        assert response.permission == SharePermission.VIEW
        assert response.expires_at == expires
        assert response.created_at == now

    def test_share_model(self):
        """测试分享记录数据库模型"""
        now = datetime.now(timezone.utc)
        expires = now + timedelta(days=7)
        share = Share(
            share_token="token-456",
            user_id="user-123",
            evaluation_id="eval-789",
            permission=SharePermission.VIEW,
            expires_at=expires,
            created_at=now
        )
        assert share.share_token == "token-456"
        assert share.user_id == "user-123"
        assert share.evaluation_id == "eval-789"

    def test_shared_evaluation(self):
        """测试分享的评估内容模型"""
        now = datetime.now(timezone.utc)
        shared = SharedEvaluation(
            evaluation_id="eval-123",
            name="测试评估",
            description="测试描述",
            input_data={"functional": {"device_count": 100}},
            result={"monthly_total": 100.0},
            permission=SharePermission.VIEW,
            created_at=now
        )
        assert shared.evaluation_id == "eval-123"
        assert shared.name == "测试评估"
        assert shared.permission == SharePermission.VIEW
