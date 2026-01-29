"""用户认证服务"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from jose import jwt, JWTError
from app.core.config import settings
from app.db.client import get_storage
from app.models.enums import UserRole, UserStatus

from passlib.context import CryptContext

# 密码加密上下文 - 使用 sha256_crypt（纯 Python 实现，Lambda 兼容）
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """获取密码哈希"""
    return pwd_context.hash(password)


class AuthService:
    """认证服务"""

    def __init__(self):
        self.storage = get_storage()
        self.table = settings.DYNAMODB_USERS_TABLE

    def register(
        self,
        email: str,
        password: str,
        name: str,
        role: UserRole = UserRole.USER,
    ) -> Dict[str, Any]:
        """
        注册新用户

        Args:
            email: 邮箱
            password: 密码
            name: 用户名
            role: 用户角色，默认为 USER

        Returns:
            用户信息（不含密码）

        Raises:
            ValueError: 邮箱已注册
        """
        # 检查邮箱是否已注册
        existing = self.storage.query(self.table, "email", email)
        if existing:
            raise ValueError("邮箱已注册")

        # 创建用户
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        user = {
            "id": user_id,
            "email": email,
            "password_hash": get_password_hash(password),
            "name": name,
            "role": role.value,
            "status": UserStatus.ACTIVE.value,
            "failed_login_count": 0,
            "locked_until": None,
            "created_at": now,
            "updated_at": now,
        }

        self.storage.put(self.table, user_id, user)

        # 返回用户信息（不含密码）
        return self._user_response(user)

    def authenticate(
        self,
        email: str,
        password: str,
    ) -> Dict[str, Any]:
        """
        认证用户

        Args:
            email: 邮箱
            password: 密码

        Returns:
            用户信息（不含密码）

        Raises:
            ValueError: 邮箱或密码错误
            PermissionError: 账号已锁定或已禁用
        """
        users = self.storage.query(self.table, "email", email)
        if not users:
            raise ValueError("邮箱或密码错误")

        user = users[0]

        # 检查账号状态
        if user.get("status", UserStatus.ACTIVE.value) == UserStatus.DISABLED.value:
            raise PermissionError("账号已被禁用，请联系管理员")

        # 检查是否被锁定
        locked_until = user.get("locked_until")
        if locked_until:
            lock_time = datetime.fromisoformat(locked_until.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            if now < lock_time:
                remaining = (lock_time - now).seconds // 60
                raise PermissionError(f"账号已锁定，请 {remaining + 1} 分钟后重试")

            # 锁定已过期，重置锁定状态
            user["locked_until"] = None
            user["failed_login_count"] = 0
            user["updated_at"] = now.isoformat()
            self.storage.put(self.table, user["id"], user)

        # 验证密码
        if not verify_password(password, user["password_hash"]):
            # 增加失败计数
            failed_count = user.get("failed_login_count", 0) + 1
            user["failed_login_count"] = failed_count
            user["updated_at"] = datetime.now(timezone.utc).isoformat()

            # 达到 3 次失败，锁定 15 分钟
            if failed_count >= 3:
                lock_time = datetime.now(timezone.utc) + timedelta(minutes=15)
                user["locked_until"] = lock_time.isoformat()

            self.storage.put(self.table, user["id"], user)
            raise ValueError("邮箱或密码错误")

        # 登录成功，重置失败计数
        if user.get("failed_login_count", 0) > 0:
            user["failed_login_count"] = 0
            user["locked_until"] = None
            user["updated_at"] = datetime.now(timezone.utc).isoformat()
            self.storage.put(self.table, user["id"], user)

        return self._user_response(user)

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        根据 ID 获取用户

        Args:
            user_id: 用户 ID

        Returns:
            用户信息（不含密码），不存在返回 None
        """
        user = self.storage.get(self.table, user_id)
        if not user:
            return None
        return self._user_response(user)

    def create_access_token(
        self,
        user_id: str,
        role: UserRole,
        expires_delta: Optional[timedelta] = None,
    ) -> str:
        """
        创建访问令牌

        Args:
            user_id: 用户 ID
            role: 用户角色
            expires_delta: 过期时间

        Returns:
            JWT 令牌
        """
        now = datetime.now(timezone.utc)
        expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))

        to_encode = {
            "sub": user_id,
            "role": role.value,
            "exp": expire,
        }

        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        验证令牌

        Args:
            token: JWT 令牌

        Returns:
            令牌数据，无效返回 None
        """
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
            return payload
        except JWTError:
            return None

    def update_user(
        self,
        user_id: str,
        name: Optional[str] = None,
        password: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        更新用户信息（用户自己更新）

        Args:
            user_id: 用户 ID
            name: 新用户名
            password: 新密码

        Returns:
            更新后的用户信息，不存在返回 None
        """
        user = self.storage.get(self.table, user_id)
        if not user:
            return None

        if name is not None:
            user["name"] = name
        if password is not None:
            user["password_hash"] = get_password_hash(password)

        user["updated_at"] = datetime.now(timezone.utc).isoformat()
        self.storage.put(self.table, user_id, user)

        return self._user_response(user)

    def get_all_users(
        self,
        role_filter: Optional[UserRole] = None,
        status_filter: Optional[UserStatus] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        获取所有用户列表

        Args:
            role_filter: 按角色筛选
            status_filter: 按状态筛选
            search: 搜索关键词（邮箱或名称）

        Returns:
            用户列表
        """
        all_users = self.storage.list_all(self.table)
        result = []

        for user in all_users:
            # 角色筛选
            if role_filter and user.get("role") != role_filter.value:
                continue
            # 状态筛选
            if status_filter and user.get("status", UserStatus.ACTIVE.value) != status_filter.value:
                continue
            # 搜索筛选
            if search:
                search_lower = search.lower()
                email_match = search_lower in user.get("email", "").lower()
                name_match = search_lower in user.get("name", "").lower()
                if not (email_match or name_match):
                    continue

            result.append(self._user_response(user))

        return result

    def admin_update_user(
        self,
        user_id: str,
        role: Optional[UserRole] = None,
        status: Optional[UserStatus] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        管理员更新用户角色或状态

        Args:
            user_id: 用户 ID
            role: 新角色
            status: 新状态

        Returns:
            更新后的用户信息，不存在返回 None
        """
        user = self.storage.get(self.table, user_id)
        if not user:
            return None

        if role is not None:
            user["role"] = role.value
        if status is not None:
            user["status"] = status.value

        user["updated_at"] = datetime.now(timezone.utc).isoformat()
        self.storage.put(self.table, user_id, user)

        return self._user_response(user)

    def unlock_user(self, user_id: str) -> bool:
        """
        解锁用户账号

        Args:
            user_id: 用户 ID

        Returns:
            是否解锁成功
        """
        user = self.storage.get(self.table, user_id)
        if not user:
            return False

        user["failed_login_count"] = 0
        user["locked_until"] = None
        user["updated_at"] = datetime.now(timezone.utc).isoformat()
        self.storage.put(self.table, user_id, user)

        return True

    def count_admins(self) -> int:
        """统计管理员数量"""
        all_users = self.storage.list_all(self.table)
        return sum(
            1 for u in all_users
            if u.get("role") == UserRole.ADMIN.value
            and u.get("status", UserStatus.ACTIVE.value) == UserStatus.ACTIVE.value
        )

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        根据邮箱获取用户

        Args:
            email: 邮箱

        Returns:
            用户信息，不存在返回 None
        """
        users = self.storage.query(self.table, "email", email)
        if not users:
            return None
        return self._user_response(users[0])

    @staticmethod
    def _user_response(user: Dict[str, Any]) -> Dict[str, Any]:
        """生成用户响应（不含敏感信息）"""
        return {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user.get("role", UserRole.USER.value),
            "status": user.get("status", UserStatus.ACTIVE.value),
            "created_at": user.get("created_at"),
        }
