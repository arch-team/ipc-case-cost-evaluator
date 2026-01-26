# 文档同步报告

生成时间: 2026-01-26T14:45:00Z
项目: IPC Case Cost Evaluator

## 同步状态

| 状态 | 说明 |
|------|------|
| ✅ 同步 | 文档与源文件一致 |

## 源文件 vs 文档

### 脚本参考 (package.json → CONTRIB.md)

| 脚本 | package.json | CONTRIB.md | 状态 |
|------|-------------|------------|------|
| `dev` | ✓ | ✓ | ✅ |
| `build` | ✓ | ✓ | ✅ |
| `lint` | ✓ | ✓ | ✅ |
| `preview` | ✓ | ✓ | ✅ |
| `test:e2e` | ✓ | ✓ | ✅ |
| `test:e2e:ui` | ✓ | ✓ | ✅ |
| `test:e2e:headed` | ✓ | ✓ | ✅ |
| `test:e2e:debug` | ✓ | ✓ | ✅ |

### 环境变量 (.env.example → CONTRIB.md)

| 变量 | .env.example | CONTRIB.md | 状态 |
|------|-------------|------------|------|
| `APP_ENV` | ✓ | ✓ | ✅ |
| `SECRET_KEY` | ✓ | ✓ | ✅ |
| `STORAGE_TYPE` | ✓ | ✓ | ✅ |
| `AWS_REGION` | ✓ (注释) | ✓ | ✅ |
| `DYNAMODB_USERS_TABLE` | ✓ (注释) | ✓ | ✅ |
| `DYNAMODB_EVALUATIONS_TABLE` | ✓ (注释) | ✓ | ✅ |

### 依赖 (requirements.txt → CONTRIB.md)

| 依赖 | requirements.txt | CONTRIB.md | 状态 |
|------|-----------------|------------|------|
| `fastapi>=0.109.0` | ✓ | ✓ | ✅ |
| `uvicorn>=0.27.0` | ✓ | ✓ | ✅ |
| `openpyxl>=3.1.2` | ✓ | ✓ | ✅ |
| `boto3>=1.34.0` | ✓ | ✓ | ✅ |
| `python-jose[cryptography]>=3.3.0` | ✓ | ✓ | ✅ |
| `passlib[bcrypt]>=1.7.4` | ✓ | ✓ | ✅ |
| `pydantic>=2.5.0` | ✓ | ✓ | ✅ |
| `pydantic-settings>=2.1.0` | ✓ | ✓ | ✅ |
| `pytest>=8.0.0` | ✓ | ✓ | ✅ |
| `pytest-asyncio>=0.23.0` | ✓ | ✓ | ✅ |
| `httpx>=0.26.0` | ✓ | ✓ | ✅ |
| `moto[dynamodb]>=5.0.0` | ✓ | ✓ | ✅ |

## 文件修改时间

| 文件 | 最后修改 | 相对年龄 |
|------|---------|---------|
| `frontend/package.json` | 2025-01-25 | 1 天 |
| `backend/requirements.txt` | 2025-01-24 | 2 天 |
| `.env.example` | 2025-01-24 | 2 天 |
| `docs/CONTRIB.md` | 2026-01-26 | **最新** |
| `docs/RUNBOOK.md` | 2026-01-26 | **最新** |

## 文档清单

### 活跃文档 (< 90 天)

| 文件 | 用途 | 状态 |
|------|------|------|
| `docs/CONTRIB.md` | 开发贡献指南 | ✅ 活跃 |
| `docs/RUNBOOK.md` | 运维手册 | ✅ 活跃 |
| `docs/plans/2025-01-24-ipc-cost-evaluator-design.md` | 设计文档 | ✅ 活跃 |
| `docs/plans/2025-01-24-implementation-plan.md` | 实现计划 | ✅ 活跃 |
| `docs/plans/2025-01-25-ux-design-plan.md` | UX 设计计划 | ✅ 活跃 |
| `docs/learning/everything-claude-code-guide.md` | 学习指南 | ✅ 活跃 |

### 过期文档 (> 90 天)

无过期文档。

## 总结

- **脚本参考**: 8/8 项同步 ✅
- **环境变量**: 6/6 项同步 ✅
- **依赖列表**: 12/12 项同步 ✅
- **过期文档**: 0 个

**结论**: 所有文档与源文件保持同步，无需更新。

## 建议

1. 当修改 `package.json` 脚本时，同步更新 `CONTRIB.md`
2. 当添加新环境变量时，同步更新 `.env.example` 和 `CONTRIB.md`
3. 当添加新依赖时，同步更新 `CONTRIB.md` 依赖列表
4. 定期运行此同步检查 (建议: 每周一次)
