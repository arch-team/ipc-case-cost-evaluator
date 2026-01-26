# Quickstart: 用户登录与角色管理

**Feature**: 002-user-auth-roles
**Date**: 2026-01-26

## 快速开始

### 1. 环境配置

在 `.env` 文件中添加初始管理员配置：

```bash
# 初始管理员账号（首次启动时自动创建）
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin123456
```

### 2. 启动服务

```bash
# 后端
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload

# 前端
cd frontend
npm run dev
```

### 3. 测试场景

#### 场景 1: 访客使用计算器

```bash
# 无需认证，直接调用计算 API
curl -X POST http://localhost:8000/api/v1/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "functional": { "device_count": 10, ... },
    "technical": { "storage_class": "STANDARD", ... },
    "pricing": { "region": "ap-northeast-1", ... }
  }'
```

#### 场景 2: 用户注册

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123",
    "name": "测试用户"
  }'

# 响应
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "测试用户",
    "role": "user",
    "status": "active"
  }
}
```

#### 场景 3: 用户登录

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123"
  }'
```

#### 场景 4: 保存评估记录（需登录）

```bash
TOKEN="eyJ..."

curl -X POST http://localhost:8000/api/v1/evaluations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "我的评估",
    "description": "测试评估",
    "input_data": {...},
    "result": {...}
  }'
```

#### 场景 5: 管理员查看用户列表

```bash
ADMIN_TOKEN="eyJ..."

curl http://localhost:8000/api/v1/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### 场景 6: 管理员修改用户角色

```bash
curl -X PUT http://localhost:8000/api/v1/admin/users/{user_id} \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

## 权限矩阵快速参考

| 操作 | Viewer | User | Admin |
|------|--------|------|-------|
| 成本计算 | ✅ | ✅ | ✅ |
| 方案对比 | ✅ | ✅ | ✅ |
| 查看定价 | ✅ | ✅ | ✅ |
| 查看模板 | ✅ | ✅ | ✅ |
| 访问分享链接 | ✅ | ✅ | ✅ |
| 保存评估 | ❌ | ✅ | ✅ |
| 管理评估记录 | ❌ | ✅ | ✅ |
| 创建分享链接 | ❌ | ✅ | ✅ |
| 修改个人信息 | ❌ | ✅ | ✅ |
| 查看用户列表 | ❌ | ❌ | ✅ |
| 修改用户角色 | ❌ | ❌ | ✅ |
| 禁用用户 | ❌ | ❌ | ✅ |
| 系统统计 | ❌ | ❌ | ✅ |
| 刷新定价 | ❌ | ❌ | ✅ |

## 错误代码

| HTTP 状态码 | 场景 |
|------------|------|
| 400 | 参数验证失败（邮箱格式、密码强度等） |
| 401 | 未认证或 Token 无效/过期 |
| 403 | 权限不足或账号被锁定/禁用 |
| 404 | 资源不存在 |

## 前端集成示例

### AuthContext 使用

```tsx
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, hasRole, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  return (
    <div>
      <p>欢迎, {user.name} ({user.role})</p>
      {hasRole('admin') && <AdminPanel />}
      <button onClick={logout}>退出</button>
    </div>
  );
}
```

### ProtectedRoute 使用

```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function App() {
  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/calculate" element={<CalculatePage />} />

      {/* 需要登录 */}
      <Route path="/evaluations" element={
        <ProtectedRoute minRole="user">
          <EvaluationsPage />
        </ProtectedRoute>
      } />

      {/* 管理员专用 */}
      <Route path="/admin" element={
        <ProtectedRoute minRole="admin">
          <AdminPage />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
```

## 测试命令

```bash
# 后端测试
cd backend
pytest tests/test_auth.py -v
pytest tests/test_permissions.py -v
pytest tests/test_admin.py -v

# 前端 E2E 测试
cd frontend
npm run test:e2e
```
