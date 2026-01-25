<!--
Sync Impact Report
==================
Version change: N/A → 1.0.0 (Initial creation)
Modified principles: N/A (Initial)
Added sections:
  - Core Principles (5 principles)
  - Development Standards section
  - Quality Standards section
  - Governance section
Removed sections: N/A (Initial)
Templates requiring updates:
  - plan-template.md: ⚠ pending - add Constitution Check references
  - spec-template.md: ✅ compatible (no changes required)
  - tasks-template.md: ✅ compatible (no changes required)
Follow-up TODOs: None
-->

# IPC Case Cost Evaluator Constitution

## Core Principles

### I. 三维度模型设计 (Three-Dimensional Model)

系统 MUST 采用三维度模型组织成本计算逻辑：

- **FunctionalDimensions**：功能维度，定义业务场景参数（设备数、录像模式、视频质量、保留天数等）
- **TechnicalDimensions**：技术维度，定义方案选型参数（存储类型、生命周期策略）
- **PricingDimensions**：价格维度，定义 AWS 定价参数（区域、折扣、计费模式）

**理由**：三维度分离使业务需求、技术方案和定价模型解耦，便于独立演进和测试。所有成本计算 MUST 通过 `CostCalculationInput` 组合三维度输入。

### II. 计算器继承体系 (Calculator Hierarchy)

所有存储类型计算器 MUST 遵循以下结构：

- **BaseCalculator**：提供通用静态方法（数据量、请求数、检索量计算），遵循函数式编程风格，无副作用
- **专用计算器**（如 `S3StandardCalculator`、`S3GlacierCalculator`）：继承基础逻辑，添加存储类型特定计算

**理由**：确保计算公式一致性，新存储类型 MUST 复用 `BaseCalculator` 的基础计算，避免重复实现。

### III. Pydantic 数据模型优先 (Pydantic-First Models)

所有数据模型 MUST 使用 Pydantic：

- 输入模型：使用 `Field` 定义验证规则（`ge`、`le`、`description`）
- 输出模型：使用 `@computed_field` 定义派生属性
- 枚举：使用 `Enum` 定义有限选项，并在枚举中内嵌数据率等业务常量

**理由**：Pydantic 提供运行时验证、自动文档生成和类型安全。`VideoQuality.data_rate_kb` 等属性 MUST 在枚举内定义，保持单一数据源。

### IV. 测试驱动验证 (Test-Driven Validation)

测试 MUST 覆盖以下场景：

- **边界情况**：单设备、零回看、最大折扣
- **场景变化**：全天候/事件触发/定时段录像模式
- **数学验证**：费用明细总和等于月度总成本、年度成本等于月度乘 12
- **比例关系**：4K 数据量是 1080p 的 4.8 倍、90 天存储量是 30 天的 3 倍

**理由**：测试验证公式正确性和业务规则。每个计算器 MUST 有对应的测试类，覆盖正常场景、边界情况和数学关系。

### V. 定价数据外部化 (Externalized Pricing Data)

定价数据 MUST 从计算逻辑分离：

- **本地 JSON**：`backend/app/data/aws_pricing/*.json` 存储区域定价
- **PricingService**：提供统一的定价获取接口，支持 AWS API 实时查询和本地回退
- **PricingLoader**：支持按区域加载定价数据

**理由**：AWS 定价频繁变化，外部化数据使更新无需修改代码。计算器 MUST 通过 `PricingService` 获取定价，禁止硬编码价格。

## Development Standards

### API 设计标准

- FastAPI 路由 MUST 按功能模块组织（`calculate`、`compare`、`pricing` 等）
- 所有 API 响应 MUST 返回 Pydantic 模型
- API 版本前缀 MUST 使用 `/api/v1`
- 健康检查端点 MUST 位于 `/health`

### 代码组织标准

```
backend/
├── app/
│   ├── api/routes/        # API 路由
│   ├── models/            # Pydantic 数据模型
│   ├── services/          # 业务逻辑
│   │   └── calculator/    # 成本计算引擎
│   ├── data/              # 静态数据
│   │   └── aws_pricing/   # AWS 定价 JSON
│   ├── core/              # 配置
│   └── db/                # 数据库
└── tests/                 # 测试
    └── e2e/               # 端到端测试
```

### 命名规范

- 文件名：`snake_case.py`
- 类名：`PascalCase`
- 函数/方法：`snake_case`
- 常量：`UPPER_SNAKE_CASE`
- 所有代码注释和文档 MUST 使用中文

## Quality Standards

### 成本计算精度

- 金额计算 MUST 保持浮点精度
- 测试验证 MUST 使用 `pytest.approx(expected, rel=0.01)` 允许 1% 误差
- 百分比计算 MUST 处理总费用为零的边界情况

### 模型验证

- 输入验证：设备数 `ge=1`、保留天数 `ge=1, le=365`、折扣 `ge=0, le=0.5`
- 生命周期策略 MUST 验证阶段连续性（无重叠、无间隙）
- 无效输入 MUST 抛出 `ValueError` 并提供清晰错误信息

### 测试覆盖

- 每个计算器 MUST 有独立测试文件
- 测试 MUST 使用 pytest fixtures 管理测试数据
- E2E 测试 MUST 验证完整用户旅程

## Governance

- 本 Constitution 优先于其他开发实践
- 修改 Constitution MUST 包含：变更说明、影响分析、迁移计划
- 所有 PR/代码审查 MUST 验证 Constitution 合规性
- 复杂性增加 MUST 提供合理理由

**Version**: 1.0.0 | **Ratified**: 2025-01-25 | **Last Amended**: 2025-01-25
