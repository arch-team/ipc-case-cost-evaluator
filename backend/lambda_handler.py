"""
AWS Lambda 入口点 - Mangum 适配器

将 FastAPI 应用适配为 AWS Lambda 处理函数。
Mangum 处理:
- API Gateway HTTP API 事件
- API Gateway REST API 事件
- ALB 事件
"""

from mangum import Mangum
from app.main import app

# 创建 Lambda 处理函数
# lifespan="off" 禁用 ASGI lifespan 事件（Lambda 不支持）
handler = Mangum(app, lifespan="off")
