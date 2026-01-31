# Quickstart: 详细成本核算记录

**Feature**: 004-detailed-cost-records
**Date**: 2026-01-31

## 概述

本功能实现 IPC 场景下 AWS 成本评估的详细核算记录功能，包括：
- **实时预览**：用户修改参数时实时显示详细核算信息
- **记录保存**：将核算结果持久化，支持历史查看和管理

## 快速开始

### 1. 后端开发

#### 启动开发环境

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### 核心文件

| 文件 | 说明 |
|------|------|
| `app/models/calculation_records.py` | 数据模型定义 |
| `app/services/calculation_record_generator.py` | 核算记录生成器 |
| `app/api/routes/calculation_records.py` | API 路由 |
| `app/db/repositories/calculation_records.py` | 数据访问层 |

#### 关键 API

```bash
# 获取默认参数
curl http://localhost:8000/api/v1/defaults

# 实时计算（无需登录）
curl -X POST http://localhost:8000/api/v1/calculate-detailed \
  -H "Content-Type: application/json" \
  -d '{"functional": {...}, "technical": {...}, "pricing": {...}}'

# 保存记录（需要登录）
curl -X POST http://localhost:8000/api/v1/calculation-records \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "测试记录", "input_data": {...}}'

# 获取记录列表
curl http://localhost:8000/api/v1/calculation-records \
  -H "Authorization: Bearer $TOKEN"

# 获取记录详情
curl http://localhost:8000/api/v1/calculation-records/{record_id} \
  -H "Authorization: Bearer $TOKEN"

# 删除记录
curl -X DELETE http://localhost:8000/api/v1/calculation-records/{record_id} \
  -H "Authorization: Bearer $TOKEN"
```

### 2. 前端开发

#### 启动开发环境

```bash
cd frontend
npm install
npm run dev
```

#### 核心文件

| 文件 | 说明 |
|------|------|
| `src/types/calculationRecords.ts` | TypeScript 类型定义 |
| `src/api/calculationRecords.ts` | API 客户端 |
| `src/pages/CalculationRecords.tsx` | 列表页面 |
| `src/pages/CalculationRecordDetail.tsx` | 详情页面 |
| `src/components/calculator/DetailedCostPreview.tsx` | 实时预览组件 |
| `src/components/calculator/SaveRecordDialog.tsx` | 保存对话框 |

#### 路由配置

```tsx
// App.tsx
<Route path="calculation-records" element={<CalculationRecords />} />
<Route path="calculation-records/:id" element={<CalculationRecordDetail />} />
```

### 3. 数据库

#### DynamoDB 表

本地开发时使用 LocalStorage，生产环境使用 DynamoDB。

新增表：`ipc_cost_calculation_records`
- PK: `user_id`
- SK: `record_id` (格式: `CALC#{timestamp}#{uuid8}`)

#### CDK 部署

```bash
cd infra
npm run deploy:dev
```

### 4. 测试

#### 后端测试

```bash
cd backend
pytest tests/test_calculation_records.py -v
```

#### E2E 测试

```bash
cd frontend
npm run test:e2e
```

## 开发流程

### 实现顺序

1. **Phase 1**: 后端模型和服务
   - 创建 `calculation_records.py` 数据模型
   - 创建 `calculation_record_generator.py` 生成器
   - 创建数据访问层

2. **Phase 2**: 后端 API
   - 实现 5 个 API 端点
   - 注册路由
   - 添加配置

3. **Phase 3**: 前端类型和 API
   - 创建 TypeScript 类型
   - 创建 API 客户端

4. **Phase 4**: 前端页面
   - 实现实时预览组件
   - 实现列表页面
   - 实现详情页面
   - 集成到 Calculator 页面

5. **Phase 5**: 测试验证
   - 后端单元测试
   - E2E 测试

### 验收标准

- [ ] 页面加载时显示默认参数和详细核算信息
- [ ] 参数修改后 500ms 内自动更新详细核算
- [ ] 未登录用户可使用实时预览
- [ ] 登录用户可保存、查看、删除记录
- [ ] 详情页展示完整核算信息（中间指标、分阶段费用、汇总）
- [ ] 每项费用显示：单价 × 用量 = 金额

## 注意事项

1. **数据大小**: DynamoDB 单项限制 400KB，需监控记录大小
2. **防抖策略**: 前端使用 500ms 防抖，避免频繁 API 调用
3. **权限控制**: 实时预览无需登录，记录管理需要登录
4. **不可变性**: 核算记录不支持更新，仅支持 CRD 操作
5. **定价快照**: 保存完整定价数据，确保可重现性

## 相关文档

- [功能规格说明](./spec.md)
- [数据模型设计](./data-model.md)
- [API 契约](./contracts/openapi.yaml)
- [技术研究](./research.md)
