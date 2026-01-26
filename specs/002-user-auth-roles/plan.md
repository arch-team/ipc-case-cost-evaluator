# Implementation Plan: 用户登录与角色管理

**Branch**: `002-user-auth-roles` | **Date**: 2026-01-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-user-auth-roles/spec.md`

## Summary

为 IPC Cost Evaluator 系统增加基于角色的访问控制（RBAC）。系统支持三种角色层级：Admin（管理员）> User（登录用户）> Viewer（访客）。访客可无需登录使用核心计算功能，登录用户可保存和管理评估记录，管理员拥有完整系统权限。技术上在现有 JWT 认证基础上扩展角色字段，并添加权限中间件进行端点级访问控制。

## Technical Context

**Language/Version**: Python 3.11+ (Backend), TypeScript 5.9+ (Frontend)
**Primary Dependencies**: FastAPI, Pydantic, python-jose[cryptography], passlib[bcrypt], React 19, Ant Design 6, React Query 5
**Storage**: Amazon DynamoDB (users, evaluations, shares 表), 本地 JSON (AWS 定价数据)
**Testing**: pytest, pytest-asyncio (Backend), Playwright (E2E)
**Target Platform**: Web 应用 (Linux 服务器部署)
**Project Type**: Web 应用 (frontend + backend)
**Performance Goals**: 100 并发用户，API 响应 < 1s
**Constraints**: 会话过期 24 小时，登录锁定 15 分钟，密码最低 8 位（字母+数字）
**Scale/Scope**: 中规模部门级应用，100 并发用户

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 状态 | 说明 |
|------|------|------|
| I. 三维度模型设计 | ✅ 不受影响 | 角色权限与成本计算模型独立，不修改核心计算逻辑 |
| II. 计算器继承体系 | ✅ 不受影响 | 不涉及计算器修改 |
| III. Pydantic 数据模型优先 | ✅ 遵循 | 用户实体使用 Pydantic 模型，角色使用 Enum |
| IV. 测试驱动验证 | ✅ 遵循 | 添加权限测试用例，覆盖各角色场景 |
| V. 定价数据外部化 | ✅ 不受影响 | 不涉及定价数据修改 |
| API 设计标准 | ✅ 遵循 | 新端点遵循 `/api/v1` 前缀，返回 Pydantic 模型 |
| 代码组织标准 | ✅ 遵循 | 权限相关代码放入 `services/` 和 `api/routes/` |
| 命名规范 | ✅ 遵循 | 使用中文注释，遵循 snake_case/PascalCase |

**Constitution Check Result**: ✅ PASS - 无违规，可继续

## Project Structure

### Documentation (this feature)

```text
specs/002-user-auth-roles/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出
├── data-model.md        # Phase 1 输出
├── quickstart.md        # Phase 1 输出
├── contracts/           # Phase 1 输出
│   └── api.yaml         # OpenAPI 规格
└── tasks.md             # Phase 2 输出
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/routes/
│   │   ├── auth.py          # 修改：添加角色返回
│   │   ├── users.py         # 新增：用户管理 API
│   │   └── admin.py         # 新增：管理员 API
│   ├── models/
│   │   ├── user.py          # 新增：用户 Pydantic 模型
│   │   └── enums.py         # 修改：添加 UserRole 枚举
│   ├── services/
│   │   ├── auth.py          # 修改：添加角色逻辑
│   │   ├── permission.py    # 新增：权限检查服务
│   │   └── user_service.py  # 新增：用户管理服务
│   ├── middleware/
│   │   └── rbac.py          # 新增：角色权限中间件
│   ├── core/
│   │   └── config.py        # 修改：添加 ADMIN_EMAIL, ADMIN_PASSWORD
│   └── db/
│       └── repositories/
│           └── users.py     # 修改：添加角色字段
└── tests/
    ├── test_auth.py         # 修改：添加角色测试
    ├── test_permissions.py  # 新增：权限测试
    └── test_admin.py        # 新增：管理员功能测试

frontend/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx       # 已存在，可能需调整
│   │   │   ├── RegisterForm.tsx    # 已存在，可能需调整
│   │   │   └── ProtectedRoute.tsx  # 新增：路由保护组件
│   │   └── admin/
│   │       ├── UserList.tsx        # 新增：用户列表
│   │       ├── UserRoleEditor.tsx  # 新增：角色编辑
│   │       └── SystemStats.tsx     # 新增：系统统计
│   ├── pages/
│   │   └── admin/
│   │       └── AdminPage.tsx       # 新增：管理员页面
│   ├── services/
│   │   ├── authService.ts          # 修改：添加角色处理
│   │   └── adminService.ts         # 新增：管理员 API 调用
│   ├── hooks/
│   │   └── useAuth.ts              # 修改：添加角色检查
│   └── contexts/
│       └── AuthContext.tsx         # 修改：添加角色状态
└── tests/
    └── e2e/
        ├── auth.spec.ts            # 修改：添加角色测试
        └── admin.spec.ts           # 新增：管理员功能测试
```

**Structure Decision**: 采用现有 Web 应用结构（backend + frontend），在现有目录基础上扩展权限相关模块。

## Complexity Tracking

> 无 Constitution 违规需要说明

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
