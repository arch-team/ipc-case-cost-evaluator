# Tasks: 用户登录与角色管理

**Input**: Design documents from `/specs/002-user-auth-roles/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.yaml ✅

**Tests**: 未显式请求测试，本任务清单不包含测试任务。如需 TDD 模式，请重新生成并指定测试需求。

**Organization**: 任务按用户故事分组，支持独立实现和测试。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 所属用户故事（US1, US2, US3, US4, US5）
- 包含精确文件路径

---

## Phase 1: Setup (共享基础设施)

**Purpose**: 配置更新和基础结构准备

- [X] T001 更新环境配置，添加 ADMIN_EMAIL 和 ADMIN_PASSWORD 到 backend/app/core/config.py
- [X] T002 [P] 添加 UserRole 枚举到 backend/app/models/enums.py
- [X] T003 [P] 添加 UserStatus 枚举到 backend/app/models/enums.py
- [X] T004 [P] 创建用户 Pydantic 模型文件 backend/app/models/user.py

---

## Phase 2: Foundational (核心权限基础设施)

**Purpose**: 权限系统核心组件，必须在所有用户故事之前完成

**⚠️ CRITICAL**: 此阶段完成前，不能开始任何用户故事的实现

### 用户实体扩展

- [X] T005 扩展用户 Repository，添加角色和状态字段到 backend/app/db/repositories/users.py
- [X] T006 更新 AuthService，添加角色字段到用户创建和响应中 backend/app/services/auth.py

### 权限中间件

- [X] T007 创建权限检查依赖函数 require_role() 在 backend/app/api/dependencies.py
- [X] T008 更新 JWT Token 结构，在 payload 中包含 role 字段 backend/app/services/auth.py

### 初始管理员

- [X] T009 实现应用启动时自动创建初始管理员的逻辑 backend/app/main.py

**Checkpoint**: 权限基础设施就绪 - 用户故事实现可以开始

---

## Phase 3: User Story 1 - 访客使用成本计算器 (Priority: P1) 🎯 MVP

**Goal**: 访客无需登录即可使用核心成本计算功能

**Independent Test**: 在未登录状态下调用 /calculate 和 /compare API，验证返回完整结果

### Backend 实现

- [X] T010 [US1] 确保 /calculate 端点无需认证可访问 backend/app/api/routes/calculate.py
- [X] T011 [US1] 确保 /compare 端点无需认证可访问 backend/app/api/routes/compare.py
- [X] T012 [US1] 确保 /pricing/* 端点无需认证可访问 backend/app/api/routes/pricing.py
- [X] T013 [US1] 确保 /templates/* 端点无需认证可访问 backend/app/api/routes/templates.py

### Frontend 实现

- [X] T014 [P] [US1] 更新 AuthContext 添加 isAuthenticated 和 hasRole 方法 frontend/src/contexts/AuthContext.tsx
- [X] T015 [US1] 在计算页面添加"保存需登录"提示组件 frontend/src/pages/CalculatePage.tsx

**Checkpoint**: US1 完成 - 访客可以使用所有计算功能

---

## Phase 4: User Story 2 - 用户注册与登录 (Priority: P1) 🎯 MVP

**Goal**: 用户可以注册、登录、退出，并获得 User 角色

**Independent Test**: 新用户注册后自动登录，响应中包含 role: "user"

### Backend - 密码验证

- [X] T016 [US2] 添加密码强度验证器（8位+字母+数字）到 backend/app/models/user.py
- [X] T017 [US2] 更新注册端点，返回包含 user 对象的 TokenResponse backend/app/api/routes/auth.py

### Backend - 登录锁定

- [X] T018 [US2] 添加登录失败计数和锁定逻辑到 AuthService backend/app/services/auth.py
- [X] T019 [US2] 更新登录端点，检查账号锁定状态 backend/app/api/routes/auth.py

### Backend - 用户信息更新

- [X] T020 [US2] 添加 /auth/update 端点，用户修改自己的名称和密码 backend/app/api/routes/auth.py

### Frontend - 认证界面

- [X] T021 [P] [US2] 更新 LoginForm，添加错误提示和锁定状态显示 frontend/src/components/auth/LoginForm.tsx
- [X] T022 [P] [US2] 更新 RegisterForm，添加密码强度提示 frontend/src/components/auth/RegisterForm.tsx
- [X] T023 [US2] 更新 authService，处理新的 TokenResponse 结构 frontend/src/services/authService.ts
- [X] T024 [US2] 更新 useAuth hook，存储用户角色信息 frontend/src/hooks/useAuth.ts

**Checkpoint**: US2 完成 - 用户可以注册、登录、退出，角色正确分配

---

## Phase 5: User Story 3 - 登录用户管理评估记录 (Priority: P2)

**Goal**: 登录用户可以保存、查看、编辑、删除自己的评估记录

**Independent Test**: 登录用户保存评估后，在历史列表中可见并可加载

### Backend - 权限控制

- [X] T025 [US3] 为 /evaluations/* 端点添加 require_role(USER) 依赖 backend/app/api/routes/evaluations.py
- [X] T026 [US3] 为分享创建端点添加 require_role(USER) 依赖 backend/app/api/routes/shares.py

### Frontend - 路由保护

- [X] T027 [P] [US3] 创建 ProtectedRoute 组件 frontend/src/components/auth/ProtectedRoute.tsx
- [X] T028 [US3] 在评估历史页面使用 ProtectedRoute 保护 frontend/src/App.tsx

**Checkpoint**: US3 完成 - 登录用户可以完整管理自己的评估记录

---

## Phase 6: User Story 4 - 管理员管理用户和系统 (Priority: P2)

**Goal**: 管理员可以查看用户列表、管理角色、查看统计

**Independent Test**: 管理员登录后访问 /admin/users 返回所有用户列表

### Backend - 用户管理服务

- [X] T029 [P] [US4] 创建 UserService 用户管理服务 backend/app/services/user_service.py
- [X] T030 [P] [US4] 创建 StatsService 系统统计服务 backend/app/services/stats_service.py

### Backend - 管理员 API

- [X] T031 [US4] 创建管理员路由文件 backend/app/api/routes/admin.py
- [X] T032 [US4] 实现 GET /admin/users 用户列表端点 backend/app/api/routes/admin.py
- [X] T033 [US4] 实现 GET /admin/users/{id} 用户详情端点 backend/app/api/routes/admin.py
- [X] T034 [US4] 实现 PUT /admin/users/{id} 更新角色/状态端点 backend/app/api/routes/admin.py
- [X] T035 [US4] 实现 POST /admin/users/{id}/unlock 解锁端点 backend/app/api/routes/admin.py
- [X] T036 [US4] 实现 GET /admin/stats 系统统计端点 backend/app/api/routes/admin.py
- [X] T037 [US4] 添加最后一个管理员保护逻辑到 PUT /admin/users/{id} backend/app/api/routes/admin.py
- [X] T038 [US4] 注册管理员路由到 FastAPI 应用 backend/app/main.py

### Frontend - 管理员界面

- [X] T039 [P] [US4] 创建 adminService API 调用服务 frontend/src/services/adminService.ts
- [X] T040 [P] [US4] 创建 UserList 用户列表组件 frontend/src/components/admin/UserList.tsx
- [X] T041 [P] [US4] 创建 UserRoleEditor 角色编辑组件 frontend/src/components/admin/UserRoleEditor.tsx
- [X] T042 [P] [US4] 创建 SystemStats 统计组件 frontend/src/components/admin/SystemStats.tsx
- [X] T043 [US4] 创建 AdminPage 管理员页面 frontend/src/pages/admin/AdminPage.tsx
- [X] T044 [US4] 在路由中添加管理员页面（ProtectedRoute minRole="admin"）frontend/src/App.tsx

**Checkpoint**: US4 完成 - 管理员可以完整管理用户和查看系统统计

---

## Phase 7: User Story 5 - 访客访问分享链接 (Priority: P3)

**Goal**: 访客可以通过分享链接查看评估结果（只读）

**Independent Test**: 使用有效分享链接访问 /shared/{token}，返回评估数据

### Backend 实现

- [ ] T045 [US5] 确保 /shared/{token} 端点无需认证可访问 backend/app/api/routes/shares.py

### Frontend 实现

- [ ] T046 [US5] 在分享页面显示只读提示 frontend/src/pages/SharedPage.tsx

**Checkpoint**: US5 完成 - 访客可以通过分享链接查看评估结果

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事的改进和完善

- [ ] T047 [P] 更新 API 文档，添加角色权限说明 backend/app/main.py
- [ ] T048 [P] 添加权限错误的友好中文提示 backend/app/api/dependencies.py
- [ ] T049 验证 quickstart.md 中所有场景可正常运行
- [ ] T050 代码清理和重构

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (BLOCKS all user stories)
    ↓
┌───────────────────────────────────────────────────────┐
│  Phase 3: US1 (P1) ──┐                                │
│  Phase 4: US2 (P1) ──┼── 可并行或按优先级顺序         │
│  Phase 5: US3 (P2) ──┤                                │
│  Phase 6: US4 (P2) ──┤                                │
│  Phase 7: US5 (P3) ──┘                                │
└───────────────────────────────────────────────────────┘
    ↓
Phase 8: Polish
```

### User Story Dependencies

| 用户故事 | 依赖于 | 可独立测试 |
|---------|-------|-----------|
| US1 (访客计算) | Phase 2 | ✅ 无需其他故事 |
| US2 (注册登录) | Phase 2 | ✅ 无需其他故事 |
| US3 (评估管理) | Phase 2, US2 | ✅ 需要登录功能 |
| US4 (管理员) | Phase 2, US2 | ✅ 需要登录功能 |
| US5 (分享访问) | Phase 2 | ✅ 无需其他故事 |

### Within Each User Story

1. Backend 先于 Frontend
2. Service 先于 Route
3. 核心功能先于边缘情况

### Parallel Opportunities

**Phase 1 (全部可并行)**:
- T002, T003, T004

**Phase 4 US2 Frontend (可并行)**:
- T021, T022

**Phase 6 US4 Backend Services (可并行)**:
- T029, T030

**Phase 6 US4 Frontend Components (可并行)**:
- T039, T040, T041, T042

---

## Parallel Example: Phase 6 User Story 4

```bash
# 并行启动 Backend Services:
Task T029: "创建 UserService 用户管理服务 backend/app/services/user_service.py"
Task T030: "创建 StatsService 系统统计服务 backend/app/services/stats_service.py"

# 并行启动 Frontend Components:
Task T039: "创建 adminService API 调用服务 frontend/src/services/adminService.ts"
Task T040: "创建 UserList 用户列表组件 frontend/src/components/admin/UserList.tsx"
Task T041: "创建 UserRoleEditor 角色编辑组件 frontend/src/components/admin/UserRoleEditor.tsx"
Task T042: "创建 SystemStats 统计组件 frontend/src/components/admin/SystemStats.tsx"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational (CRITICAL)
3. 完成 Phase 3: US1 (访客计算)
4. 完成 Phase 4: US2 (注册登录)
5. **STOP and VALIDATE**: 测试访客和登录用户的完整流程
6. 可部署 MVP 版本

### Incremental Delivery

| 阶段 | 交付价值 |
|------|---------|
| Setup + Foundational | 权限基础设施就绪 |
| + US1 | 访客可使用计算功能 |
| + US2 | 用户可注册登录 |
| + US3 | 用户可保存评估记录 |
| + US4 | 管理员可管理用户 |
| + US5 | 分享功能完整 |
| + Polish | 生产就绪 |

---

## Notes

- 所有任务使用中文描述
- 现有功能（评估、分享）已存在，只需添加权限控制
- US1 和 US2 是 MVP 核心，优先完成
- US3 和 US4 可并行开发（不同团队成员）
- US5 相对独立，可最后实现
- 每个 Checkpoint 后应进行功能验证
