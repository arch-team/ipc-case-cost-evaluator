# 运维手册 (Runbook)

本文档为 IPC Case Cost Evaluator 项目的运维手册，包含部署、监控、故障排查和回滚流程。

## 部署流程

### 环境准备

#### 1. 服务器要求

- **操作系统**: Ubuntu 22.04 LTS / Amazon Linux 2
- **Python**: 3.11+
- **Node.js**: 18+
- **内存**: 最小 2GB
- **磁盘**: 最小 20GB

#### 2. AWS 资源 (生产环境)

- DynamoDB 表:
  - `ipc-cost-users` - 用户数据
  - `ipc-cost-evaluations` - 评估数据
- IAM 角色 (需要 DynamoDB 读写权限)

### 部署步骤

#### 后端部署

```bash
# 1. 拉取代码
git pull origin main

# 2. 激活虚拟环境
cd backend
source .venv/bin/activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 配置环境变量
export APP_ENV=production
export SECRET_KEY=<your-production-secret-key>
export STORAGE_TYPE=dynamodb
export AWS_REGION=ap-northeast-1
export DYNAMODB_USERS_TABLE=ipc-cost-users
export DYNAMODB_EVALUATIONS_TABLE=ipc-cost-evaluations

# 5. 启动服务 (使用 gunicorn 或 uvicorn)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

#### 前端部署

```bash
# 1. 拉取代码
cd frontend

# 2. 安装依赖
npm ci

# 3. 构建生产版本
npm run build

# 4. 部署静态文件到 CDN/S3/Nginx
# dist/ 目录包含构建产物
```

#### 使用 Docker (推荐)

```bash
# 构建镜像
docker build -t ipc-cost-evaluator-backend ./backend
docker build -t ipc-cost-evaluator-frontend ./frontend

# 运行容器
docker run -d \
  -p 8000:8000 \
  -e APP_ENV=production \
  -e SECRET_KEY=<secret> \
  -e STORAGE_TYPE=dynamodb \
  ipc-cost-evaluator-backend
```

## 监控与告警

### 健康检查

```bash
# API 健康检查端点
curl http://localhost:8000/health

# 预期响应
{"status": "healthy"}
```

### 日志位置

| 组件 | 日志位置 |
|------|----------|
| 后端应用 | `stdout` / CloudWatch Logs |
| Uvicorn | `stdout` |
| 前端 (Nginx) | `/var/log/nginx/` |

### 关键指标

| 指标 | 阈值 | 告警条件 |
|------|------|----------|
| API 响应时间 | < 500ms | P95 > 1s |
| 错误率 | < 1% | > 5% |
| CPU 使用率 | < 70% | > 85% |
| 内存使用率 | < 70% | > 85% |
| DynamoDB 读取容量 | - | 超出预置容量 |
| DynamoDB 写入容量 | - | 超出预置容量 |

### CloudWatch 告警配置示例

```yaml
# 错误率告警
Alarm:
  AlarmName: IPC-Cost-API-ErrorRate
  MetricName: 5xxErrorRate
  Threshold: 5
  Period: 300
  EvaluationPeriods: 2
  ComparisonOperator: GreaterThanThreshold
```

## 常见问题与修复

### 问题 1: API 响应 500 错误

**症状**: API 返回 Internal Server Error

**排查步骤**:
1. 查看应用日志
   ```bash
   tail -f /var/log/app/backend.log
   ```
2. 检查 DynamoDB 连接
   ```bash
   aws dynamodb describe-table --table-name ipc-cost-evaluations
   ```
3. 验证环境变量
   ```bash
   env | grep -E "(AWS|DYNAMO|APP)"
   ```

**修复方案**:
- 检查 AWS 凭证是否过期
- 验证 DynamoDB 表是否存在
- 检查 IAM 权限是否正确

---

### 问题 2: 前端无法连接后端 API

**症状**: 前端显示网络错误

**排查步骤**:
1. 检查后端服务状态
   ```bash
   curl http://localhost:8000/health
   ```
2. 检查 CORS 配置
3. 验证 Nginx 代理配置

**修复方案**:
- 确保后端服务运行中
- 检查防火墙规则
- 验证 CORS 允许前端域名

---

### 问题 3: DynamoDB 读写延迟高

**症状**: API 响应时间显著增加

**排查步骤**:
1. 查看 CloudWatch DynamoDB 指标
2. 检查是否存在热分区

**修复方案**:
- 增加预置容量或切换到按需模式
- 优化查询模式，添加 GSI

---

### 问题 4: JWT Token 验证失败

**症状**: 用户无法登录或请求返回 401

**排查步骤**:
1. 检查 SECRET_KEY 是否正确配置
2. 验证 Token 是否过期

**修复方案**:
- 确保所有实例使用相同的 SECRET_KEY
- 清除浏览器本地存储，重新登录

## 回滚流程

### 快速回滚

```bash
# 1. 切换到上一个稳定版本
git checkout <previous-stable-tag>

# 2. 重新部署
# 后端
cd backend
pip install -r requirements.txt
systemctl restart ipc-cost-backend

# 前端
cd frontend
npm ci && npm run build
# 重新部署静态文件
```

### Docker 回滚

```bash
# 回滚到上一个镜像版本
docker pull ipc-cost-evaluator-backend:<previous-version>
docker stop ipc-cost-backend
docker run -d --name ipc-cost-backend \
  -p 8000:8000 \
  ipc-cost-evaluator-backend:<previous-version>
```

### 数据库回滚

**注意**: DynamoDB 不支持事务回滚，如需恢复数据:

1. 从备份恢复 (如果启用了 Point-in-Time Recovery)
   ```bash
   aws dynamodb restore-table-to-point-in-time \
     --source-table-name ipc-cost-evaluations \
     --target-table-name ipc-cost-evaluations-restored \
     --restore-date-time <timestamp>
   ```

2. 手动修复数据

## 维护操作

### 定期维护清单

| 频率 | 任务 |
|------|------|
| 每日 | 检查错误日志 |
| 每周 | 审查 CloudWatch 指标 |
| 每月 | 更新依赖包 |
| 每季度 | 安全审计 |

### 依赖更新

```bash
# 后端
cd backend
pip list --outdated
pip install --upgrade <package>
pytest tests/ -v  # 确保测试通过

# 前端
cd frontend
npm outdated
npm update
npm run lint
npm run test:e2e
```

### AWS 定价数据更新

1. 获取最新 AWS S3 定价
2. 更新 `backend/app/data/aws_pricing/` 下的 JSON 文件
3. 运行测试验证
4. 部署更新

## 联系方式

| 角色 | 联系方式 |
|------|----------|
| 技术负责人 | - |
| 运维团队 | - |
| AWS 支持 | AWS Support Console |

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2025-01-26 | 1.0 | 初始版本 |
