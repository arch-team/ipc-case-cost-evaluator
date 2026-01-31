"""FastAPI 应用入口"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import (
    calculate,
    compare,
    scenarios,
    pricing,
    auth,
    evaluations,
    export,
    shares,
    templates,
    admin,
)
from app.models.enums import UserRole
from app.services.auth import AuthService

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时创建初始管理员
    await create_initial_admin()
    yield
    # 关闭时的清理操作（如需要）


async def create_initial_admin() -> None:
    """创建初始管理员账号（如果不存在）"""
    if not (settings.ADMIN_EMAIL and settings.ADMIN_PASSWORD):
        logger.info("未配置初始管理员环境变量，跳过创建")
        return

    service = AuthService()

    if service.get_user_by_email(settings.ADMIN_EMAIL):
        logger.info(f"管理员账号已存在: {settings.ADMIN_EMAIL}")
        return

    try:
        user = service.register(
            email=settings.ADMIN_EMAIL,
            password=settings.ADMIN_PASSWORD,
            name="系统管理员",
            role=UserRole.ADMIN,
        )
        logger.info(f"初始管理员创建成功: {user['email']}")
    except ValueError as e:
        logger.warning(f"初始管理员创建失败: {e}")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
# IPC 云存储成本评估系统 API

## 角色与权限说明

本系统采用基于角色的访问控制 (RBAC)，包含三种角色：

| 角色 | 权限级别 | 说明 |
|------|---------|------|
| **admin** | 最高 | 管理员，可管理所有用户和系统配置 |
| **user** | 中等 | 普通用户，可保存和管理自己的评估记录 |
| **viewer** | 最低 | 观察者，仅可查看公开内容 |

## 端点权限分类

### 公开端点 (无需认证)
- `POST /calculate` - 成本计算
- `POST /compare` - 方案对比
- `GET /pricing/*` - 定价信息
- `GET /templates/*` - 评估模板
- `GET /shared/{token}` - 查看分享内容

### 用户端点 (需要 user 或更高权限)
- `POST /evaluations` - 创建评估
- `GET /evaluations` - 查看自己的评估列表
- `PUT /evaluations/{id}` - 更新自己的评估
- `DELETE /evaluations/{id}` - 删除自己的评估
- `POST /evaluations/{id}/share` - 创建分享链接

### 管理员端点 (需要 admin 权限)
- `GET /admin/users` - 用户列表
- `GET /admin/users/{id}` - 用户详情
- `PUT /admin/users/{id}` - 更新用户角色/状态
- `POST /admin/users/{id}/unlock` - 解锁用户
- `GET /admin/stats` - 系统统计
""",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    openapi_tags=[
        {"name": "认证", "description": "用户注册、登录、Token 管理"},
        {"name": "成本计算", "description": "核心成本计算功能，公开访问"},
        {"name": "方案对比", "description": "多方案成本对比，公开访问"},
        {"name": "评估管理", "description": "评估记录的增删改查，需要 user 权限"},
        {"name": "分享", "description": "评估分享链接管理"},
        {"name": "管理员", "description": "用户管理和系统统计，需要 admin 权限"},
        {"name": "定价", "description": "AWS 定价信息查询，公开访问"},
        {"name": "模板", "description": "评估模板管理，公开访问"},
    ],
)

# 配置 CORS
def configure_cors(app: FastAPI) -> None:
    """配置 CORS 中间件"""
    cors_origins_str = os.environ.get("CORS_ALLOW_ORIGINS", "*")
    cors_origins = ["*"] if cors_origins_str == "*" else cors_origins_str.split(",")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def register_routers(app: FastAPI) -> None:
    """注册所有 API 路由"""
    routers = [
        calculate,
        compare,
        scenarios,
        pricing,
        auth,
        evaluations,
        export,
        shares,
        templates,
        admin,
    ]

    for router_module in routers:
        app.include_router(router_module.router, prefix=settings.API_V1_PREFIX)


# 应用配置
configure_cors(app)
register_routers(app)


@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {"status": "healthy", "version": settings.APP_VERSION}
