"""分享仓库单元测试"""
import pytest
from datetime import datetime, timezone, timedelta

from app.db.repositories.shares import ShareRepository
from app.db.client import reset_storage
from app.models.enums import SharePermission


class TestShareRepository:
    """分享仓库测试"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """每个测试前重置存储"""
        reset_storage()

    @pytest.fixture
    def repo(self):
        """创建测试仓库实例"""
        return ShareRepository()

    def test_create_share(self, repo):
        """测试创建分享"""
        share = repo.create(
            user_id="user-123",
            evaluation_id="eval-456",
            permission=SharePermission.VIEW,
            expires_days=7
        )
        assert share["share_token"] is not None
        assert len(share["share_token"]) == 36  # UUID 格式
        assert share["user_id"] == "user-123"
        assert share["evaluation_id"] == "eval-456"
        assert share["permission"] == SharePermission.VIEW.value

    def test_create_share_with_duplicate_permission(self, repo):
        """测试创建可复制权限的分享"""
        share = repo.create(
            user_id="user-123",
            evaluation_id="eval-456",
            permission=SharePermission.DUPLICATE,
            expires_days=30
        )
        assert share["permission"] == SharePermission.DUPLICATE.value

    def test_get_by_token(self, repo):
        """测试按 token 查询"""
        share = repo.create(
            user_id="user-123",
            evaluation_id="eval-456",
            permission=SharePermission.VIEW,
            expires_days=7
        )
        result = repo.get_by_token(share["share_token"])
        assert result is not None
        assert result["evaluation_id"] == "eval-456"
        assert result["user_id"] == "user-123"

    def test_get_nonexistent_token(self, repo):
        """测试获取不存在的 token"""
        result = repo.get_by_token("nonexistent-token")
        assert result is None

    def test_get_expired_token(self, repo):
        """测试获取过期的 token"""
        # 创建一个立即过期的分享
        share = repo.create(
            user_id="user-123",
            evaluation_id="eval-456",
            permission=SharePermission.VIEW,
            expires_days=1
        )
        # 手动修改过期时间为过去
        share_data = repo.storage.get(repo.table, share["share_token"])
        past_time = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        share_data["expires_at"] = past_time
        repo.storage.put(repo.table, share["share_token"], share_data)

        result = repo.get_by_token(share["share_token"])
        assert result is None  # 过期返回 None

    def test_delete_share(self, repo):
        """测试删除分享"""
        share = repo.create(
            user_id="user-123",
            evaluation_id="eval-456",
            permission=SharePermission.VIEW,
            expires_days=7
        )
        assert repo.delete(share["share_token"]) is True
        assert repo.get_by_token(share["share_token"]) is None

    def test_delete_nonexistent_share(self, repo):
        """测试删除不存在的分享"""
        result = repo.delete("nonexistent-token")
        assert result is False

    def test_list_by_evaluation(self, repo):
        """测试列出评估的所有分享"""
        repo.create("user-1", "eval-123", SharePermission.VIEW, 7)
        repo.create("user-1", "eval-123", SharePermission.DUPLICATE, 30)
        repo.create("user-1", "eval-456", SharePermission.VIEW, 7)  # 不同评估

        shares = repo.list_by_evaluation("eval-123")
        assert len(shares) == 2

    def test_list_by_evaluation_excludes_expired(self, repo):
        """测试列出分享时排除已过期的"""
        share1 = repo.create("user-1", "eval-123", SharePermission.VIEW, 7)
        share2 = repo.create("user-1", "eval-123", SharePermission.DUPLICATE, 7)

        # 手动使 share2 过期
        share_data = repo.storage.get(repo.table, share2["share_token"])
        past_time = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        share_data["expires_at"] = past_time
        repo.storage.put(repo.table, share2["share_token"], share_data)

        shares = repo.list_by_evaluation("eval-123")
        assert len(shares) == 1
        assert shares[0]["share_token"] == share1["share_token"]

    def test_list_by_evaluation_empty(self, repo):
        """测试列出空评估的分享"""
        shares = repo.list_by_evaluation("nonexistent-eval")
        assert shares == []
