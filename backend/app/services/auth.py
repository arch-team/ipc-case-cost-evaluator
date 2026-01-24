"""用户认证服务"""
import uuid
import warnings
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import jwt, JWTError

# 抑制 argon2-cffi 版本访问弃用警告（passlib 内部兼容性问题）
with warnings.catch_warnings():
    warnings.filterwarnings(
        "ignore",
        message="Accessing argon2.__version__",
        category=DeprecationWarning,
    )
    from passlib.context import CryptContext

from app.core.config import settings
from app.db.client import get_storage


# 密码加密上下文
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


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
    ) -> Dict[str, Any]:
        """
        注册新用户

        Args:
            email: 邮箱
            password: 密码
            name: 用户名

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
    ) -> Optional[Dict[str, Any]]:
        """
        认证用户

        Args:
            email: 邮箱
            password: 密码

        Returns:
            用户信息（不含密码），认证失败返回 None
        """
        users = self.storage.query(self.table, "email", email)
        if not users:
            return None

        user = users[0]
        if not verify_password(password, user["password_hash"]):
            return None

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
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None,
    ) -> str:
        """
        创建访问令牌

        Args:
            data: 令牌数据
            expires_delta: 过期时间

        Returns:
            JWT 令牌
        """
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )
        to_encode.update({"exp": expire})
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

    @staticmethod
    def _user_response(user: Dict[str, Any]) -> Dict[str, Any]:
        """生成用户响应（不含敏感信息）"""
        return {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "created_at": user.get("created_at"),
        }
