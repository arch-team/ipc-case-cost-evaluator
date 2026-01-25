## EVAL: lifecycle-stages
Created: 2025-01-25
Last Check: 2025-01-25 (Run #1)
Status: IN PROGRESS (31/36 passing - 86%)

### 功能概述
生命周期阶段功能 - 支持 S3 对象的多阶段存储生命周期管理和成本计算。

### Capability Evals

#### 模型层 (Models) - 7/7 passing
- [x] LifecycleStage 正确计算 duration_days 属性
- [x] LifecycleStage 验证 end_day >= start_day
- [x] LifecyclePolicy 支持简单模式（enabled + transition_days + target_class）
- [x] LifecyclePolicy 支持多阶段模式（stages 列表）
- [x] LifecyclePolicy.is_multi_stage 正确判断模式类型
- [x] LifecyclePolicy 验证阶段连续性（无重叠、无间隙）
- [x] StageCostBreakdown 正确计算 stage_total

#### 计算引擎层 (Calculator) - 8/8 passing
- [x] 简单模式：正确计算热存储和冷存储天数
- [x] 简单模式：正确计算转换费用
- [x] 多阶段模式：正确计算各阶段存储费用
- [x] 多阶段模式：仅第一阶段计算 PUT 费用
- [x] 多阶段模式：非第一阶段计算转换费用
- [x] 多阶段模式：按阶段比例分配 GET 和检索费用
- [x] calculate_with_details 返回完整的阶段明细
- [x] 两阶段多阶段模式与简单模式结果等效

#### 模板服务层 (Templates) - 5/5 passing
- [x] TemplateLoader.get_all() 返回所有预设模板
- [x] TemplateLoader.get_by_id() 返回指定模板
- [x] TemplateLoader.get_by_retention_days() 按天数范围筛选
- [x] TemplateLoader.create_policy_from_template() 创建策略对象
- [x] 模板 to_lifecycle_policy() 正确转换为策略

#### API 层 (Routes) - 4/6 passing
- [x] GET /templates 返回模板列表
- [x] GET /templates/summary 返回摘要统计
- [x] GET /templates/{id} 返回模板详情
- [x] GET /templates/filter/by-retention 筛选功能正常
- [ ] POST /calculate 支持 lifecycle_policy 参数 ⚠️ 需要测试
- [ ] POST /compare 支持 include_lifecycle 参数 ⚠️ 需要测试

### Regression Evals

#### 向后兼容性 - 4/4 passing
- [x] 不设置 lifecycle_policy 时使用默认行为
- [x] 简单模式保持与旧版本相同的计算结果
- [x] S3Standard 计算器功能不受影响
- [x] 现有 API 端点响应格式保持兼容

#### 核心计算准确性 - 3/4 passing
- [x] 存储费用计算与 AWS 定价一致
- [x] PUT/GET 请求费用计算正确
- [ ] 数据传输阶梯计费正确 ⚠️ 需要测试
- [x] 折扣计算正确应用

#### 边界情况 - 2/4 passing
- [x] 第 1 天转换场景正确处理
- [x] 最后一天转换场景正确处理
- [ ] retention_days = 1 的极端情况 ⚠️ 需要测试
- [ ] 0% 回看比例不产生 GET 费用 ⚠️ 需要测试

### Success Criteria
- pass@3 > 90% for capability evals → **当前: 96% (24/25)** ✅
- pass^3 = 100% for regression evals → **当前: 75% (9/12)** ❌

### 缺失测试项
1. `POST /calculate` 端点的 lifecycle_policy 参数验证
2. `POST /compare` 端点的 include_lifecycle 参数验证
3. 数据传输阶梯计费验证（10TB 分界点）
4. retention_days = 1 的极端边界测试
5. access_percent = 0 时不产生 GET 费用的验证

### 关键文件
```
模型:
- backend/app/models/dimensions.py (LifecycleStage, LifecyclePolicy)
- backend/app/models/results.py (StageCostBreakdown, DetailedCostBreakdown)

计算:
- backend/app/services/calculator/lifecycle.py (LifecycleCalculator)
- backend/app/services/template_loader.py (TemplateLoader)

数据:
- backend/app/data/lifecycle_templates.json

API:
- backend/app/api/routes/templates.py
- backend/app/api/routes/compare.py
- backend/app/api/routes/calculate.py

测试:
- backend/tests/test_lifecycle.py
- backend/tests/test_lifecycle_stages.py
- backend/tests/test_api_templates.py
```

### 验证命令
```bash
# 运行所有 lifecycle 相关测试
pytest backend/tests/test_lifecycle.py backend/tests/test_lifecycle_stages.py -v

# 运行 API 测试
pytest backend/tests/test_api_templates.py -v

# 运行完整测试套件
pytest backend/tests/ -v
```
