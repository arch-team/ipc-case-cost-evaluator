# Research: 用户登录与角色管理

**Feature**: 002-user-auth-roles
**Date**: 2026-01-26

## 技术决策

### 1. 角色权限模型选择

**Decision**: 基于角色的访问控制（RBAC）+ 层级继承

**Rationale**:
- 三种角色（Admin > User > Viewer）形成清晰的层级关系
- 高级角色自动继承低级角色的所有权限
- 简化权限检查逻辑：只需验证用户角色 >= 端点所需角色
- 符合 Constitution 的简单性原则

**Alternatives Considered**:
- ACL（访问控制列表）：过于复杂，需要为每个用户维护权限列表
- ABAC（基于属性的访问控制）：灵活但复杂，超出当前需求
- 细粒度 RBAC：被明确列入 Out of Scope

### 2. JWT Token 角色存储

**Decision**: 在 JWT payload 中包含 `role` 字段

**Rationale**:
- 无状态验证：每次请求无需查询数据库获取角色
- 现有 JWT 基础设施可直接扩展
- Token 过期机制已存在（24小时）

**Alternatives Considered**:
- 每次请求查询数据库获取角色：增加延迟，不符合性能目标
- Redis 缓存角色：增加基础设施复杂度，当前规模不需要

**实现方案**:
```python
# JWT payload 结构
{
    "sub": "user-uuid",
    "role": "user",  # 新增字段
    "exp": 1234567890
}
```

### 3. 权限中间件实现

**Decision**: FastAPI 依赖注入 + 装饰器模式

**Rationale**:
- 利用 FastAPI 的依赖注入系统
- 装饰器可重用于多个端点
- 保持与现有 `get_current_user` 依赖的兼容性

**实现方案**:
```python
# 权限依赖工厂函数
def require_role(min_role: UserRole):
    def dependency(current_user: dict = Depends(get_current_user)):
        user_role = UserRole(current_user.get("role", "viewer"))
        if user_role.value < min_role.value:
            raise HTTPException(status_code=403, detail="权限不足")
        return current_user
    return dependency

# 使用示例
@router.get("/admin/users")
async def list_users(user: dict = Depends(require_role(UserRole.ADMIN))):
    ...
```

### 4. 初始管理员创建

**Decision**: 应用启动时通过环境变量自动创建

**Rationale**:
- 符合 12-Factor App 原则（配置在环境变量中）
- 自动化部署友好
- 避免硬编码凭据

**实现方案**:
```python
# config.py 新增
ADMIN_EMAIL: Optional[str] = None
ADMIN_PASSWORD: Optional[str] = None

# 应用启动事件
@app.on_event("startup")
async def create_initial_admin():
    if settings.ADMIN_EMAIL and settings.ADMIN_PASSWORD:
        # 检查是否已存在管理员
        # 如不存在则创建
```

### 5. 密码强度验证

**Decision**: 后端验证 + 前端实时反馈

**Rationale**:
- 后端验证确保安全（不依赖客户端）
- 前端反馈提升用户体验
- 规则：最低 8 位，包含字母和数字

**实现方案**:
```python
# Pydantic 验证器
@field_validator('password')
def validate_password(cls, v):
    if len(v) < 8:
        raise ValueError('密码长度至少8位')
    if not re.search(r'[A-Za-z]', v):
        raise ValueError('密码必须包含字母')
    if not re.search(r'[0-9]', v):
        raise ValueError('密码必须包含数字')
    return v
```

### 6. 登录失败锁定机制

**Decision**: 基于内存的计数器 + DynamoDB 持久化

**Rationale**:
- 内存计数器处理短期连续失败（性能）
- DynamoDB 存储锁定状态（持久化）
- 15 分钟自动解锁

**实现方案**:
```python
# 用户记录新增字段
{
    "failed_login_count": 0,
    "locked_until": null  # ISO timestamp 或 null
}

# 登录逻辑
if user.locked_until and datetime.now() < user.locked_until:
    raise HTTPException(403, "账号已锁定，请稍后重试")
if failed:
    user.failed_login_count += 1
    if user.failed_login_count >= 3:
        user.locked_until = datetime.now() + timedelta(minutes=15)
else:
    user.failed_login_count = 0
    user.locked_until = None
```

### 7. 前端权限控制

**Decision**: React Context + 路由守卫

**Rationale**:
- AuthContext 提供全局用户状态和角色
- ProtectedRoute 组件进行路由级权限检查
- 与 Ant Design 和 React Router 良好集成

**实现方案**:
```typescript
// AuthContext
interface AuthState {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  hasRole: (minRole: UserRole) => boolean;
}

// ProtectedRoute
<ProtectedRoute minRole="admin">
  <AdminPage />
</ProtectedRoute>
```

### 8. API 端点权限映射

**Decision**: 端点级最低角色要求

**权限矩阵**:

| 端点分组 | 最低角色 | 说明 |
|---------|---------|------|
| `/calculate`, `/compare` | Viewer | 核心计算功能 |
| `/pricing/*`, `/templates/*` | Viewer | 只读查询 |
| `/shared/{token}` | Viewer | 分享链接访问 |
| `/evaluations/*` | User | 评估记录管理 |
| `/evaluations/*/share` | User | 创建分享链接 |
| `/auth/me`, `/auth/update` | User | 个人信息管理 |
| `/admin/users/*` | Admin | 用户管理 |
| `/admin/stats` | Admin | 系统统计 |
| `/pricing/refresh` | Admin | 刷新定价数据 |

## 技术风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| JWT 泄露导致权限滥用 | 高 | Token 24小时过期；角色变更后建议重新登录 |
| 并发用户超过100 | 中 | 监控性能；必要时引入 Redis 缓存 |
| 初始管理员密码泄露 | 高 | 首次登录后建议修改；生产环境使用安全的环境变量管理 |
| 最后一个管理员误操作 | 中 | 后端逻辑阻止；前端 UI 提示 |

## 依赖项确认

### 后端依赖（已存在）
- `python-jose[cryptography]` - JWT 处理 ✅
- `passlib[bcrypt]` - 密码哈希 ✅
- `pydantic` - 数据验证 ✅

### 前端依赖（已存在）
- `react-router-dom` - 路由 ✅
- `@tanstack/react-query` - 数据获取 ✅
- `antd` - UI 组件 ✅

### 无需新增依赖
所有需要的库已在项目中存在，无需引入新依赖。

## 数据库迁移考虑

### 用户表 schema 变更

现有字段保持不变，新增：
- `role`: string, 默认 "user"
- `status`: string, 默认 "active"（"active" | "disabled"）
- `failed_login_count`: number, 默认 0
- `locked_until`: string | null, 默认 null

### 迁移策略
- DynamoDB 是 schema-less，无需正式迁移
- 读取时处理缺失字段，提供默认值
- 现有用户默认角色为 "user"
