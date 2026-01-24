"""FastAPI 应用入口"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import calculate

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="IPC 云存储成本评估系统 API",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册 API 路由
app.include_router(calculate.router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {"status": "healthy", "version": settings.APP_VERSION}
