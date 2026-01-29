"""应用配置"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """应用配置类"""
    # 应用基本信息
    APP_NAME: str = "IPC Cost Evaluator"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # API 配置
    API_V1_PREFIX: str = "/api/v1"

    # 安全配置
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 小时

    # AWS 配置
    # APP_REGION 由 CDK 设置，AWS_REGION 由 Lambda 运行时自动设置
    APP_REGION: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None

    @property
    def aws_region(self) -> str:
        """获取 AWS 区域，优先使用 APP_REGION，其次使用 Lambda 自动设置的 AWS_REGION"""
        import os
        return self.APP_REGION or os.environ.get("AWS_REGION", "us-east-1")

    # 数据库表配置
    DYNAMODB_USERS_TABLE: str = "ipc-cost-users"
    DYNAMODB_EVALUATIONS_TABLE: str = "ipc-cost-evaluations"
    DYNAMODB_SHARES_TABLE: str = "ipc-cost-shares"

    # 存储配置
    # STORAGE_TYPE: 'local' 使用本地存储, 'dynamodb' 使用 DynamoDB
    STORAGE_TYPE: str = "local"

    @property
    def use_local_storage(self) -> bool:
        """判断是否使用本地存储"""
        return self.STORAGE_TYPE.lower() != "dynamodb"

    # 初始管理员配置（首次启动时自动创建）
    ADMIN_EMAIL: Optional[str] = None
    ADMIN_PASSWORD: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )


settings = Settings()
