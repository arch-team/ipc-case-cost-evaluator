"""应用配置"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """应用配置类"""
    APP_NAME: str = "IPC Cost Evaluator"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    AWS_REGION: str = "ap-northeast-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    DYNAMODB_USERS_TABLE: str = "ipc-cost-users"
    DYNAMODB_EVALUATIONS_TABLE: str = "ipc-cost-evaluations"
    DYNAMODB_SHARES_TABLE: str = "ipc-cost-shares"
    USE_LOCAL_STORAGE: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
