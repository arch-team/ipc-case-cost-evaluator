# IPC Cost Evaluator - 前端结构

> **Freshness**: 2026-01-26T00:00:00Z
> **版本**: 1.0.0

## 目录结构

```
frontend/src/
├── main.tsx                         # React 入口
├── App.tsx                          # 应用根组件
├── index.css                        # 全局样式
├── App.css
│
├── pages/                           # 页面组件
│   ├── Home.tsx                     # 首页/仪表板
│   ├── Calculator.tsx               # 成本计算页面
│   ├── Evaluations.tsx              # 评估历史管理
│   └── Settings.tsx                 # 设置页面
│
├── components/                      # 可复用组件
│   ├── common/
│   │   └── Layout.tsx               # 通用布局
│   │
│   ├── calculator/                  # 计算器组件
│   │   ├── InputPanel.tsx           # 输入面板容器
│   │   ├── FunctionalForm.tsx       # 功能维度表单
│   │   ├── TechnicalForm.tsx        # 技术维度表单
│   │   ├── PricingForm.tsx          # 价格维度表单
│   │   ├── ResultDisplay.tsx        # 结果展示容器
│   │   ├── CostBreakdownTable.tsx   # 费用明细表格
│   │   ├── CostPieChart.tsx         # 费用占比饼图
│   │   ├── MultiSchemePanel.tsx     # 多方案对比面板
│   │   ├── ComparisonChart.tsx      # 对比图表
│   │   ├── SensitivityAnalysis.tsx  # 灵敏度分析
│   │   ├── ScenarioSelector.tsx     # 场景选择器
│   │   ├── StorageStrategySelector.tsx # 存储策略选择
│   │   ├── StageEditor.tsx          # 生命周期阶段编辑
│   │   ├── ExportDialog.tsx         # 导出对话框
│   │   └── ShareDialog.tsx          # 分享对话框
│   │
│   ├── comparison/                  # 对比组件
│   │   ├── ComparisonDisplay.tsx
│   │   ├── ComparisonChart.tsx
│   │   └── DetailedComparisonTable.tsx
│   │
│   └── share/                       # 分享组件
│       └── ShareDialog.tsx
│
├── hooks/                           # 自定义 Hooks
│   ├── useCalculate.ts              # 计算逻辑
│   ├── useComparison.ts             # 对比逻辑
│   └── usePricing.ts                # 定价数据
│
├── utils/                           # 工具函数
│   ├── formatters.ts                # 格式化
│   ├── validators.ts                # 数据验证
│   └── storage.ts                   # 本地存储
│
├── types/                           # TypeScript 类型
│   ├── index.ts
│   ├── api.types.ts                 # API 类型
│   ├── models.types.ts              # 业务模型类型
│   └── ui.types.ts                  # UI 组件类型
│
└── api/                             # API 通信层
    ├── client.ts                    # Axios 客户端
    ├── hooks.ts                     # API Hooks
    └── services/                    # 业务服务
        ├── calculate.ts
        ├── compare.ts
        ├── evaluations.ts
        ├── shares.ts
        └── export.ts
```

---

## 组件层级关系

```
<App>
├── <ConfigProvider>                 # Ant Design 主题配置
└── <BrowserRouter>
    └── <Routes>
        └── <Layout>
            ├── Header               # 顶部导航
            ├── Sidebar              # 侧边栏
            └── <Outlet>
                ├── <Home>           # 首页
                │
                ├── <Calculator>     # 成本计算页面
                │   ├── <InputPanel>
                │   │   ├── <FunctionalForm>
                │   │   ├── <TechnicalForm>
                │   │   ├── <PricingForm>
                │   │   └── <ScenarioSelector>
                │   │
                │   ├── <ResultDisplay>
                │   │   ├── <CostBreakdownTable>
                │   │   ├── <CostPieChart>
                │   │   ├── <ComparisonChart>
                │   │   └── <SensitivityAnalysis>
                │   │
                │   ├── <MultiSchemePanel>
                │   ├── <StageEditor>
                │   ├── <ExportDialog>
                │   └── <ShareDialog>
                │
                ├── <Evaluations>    # 评估历史
                │   └── 历史记录列表与管理
                │
                └── <Settings>       # 设置
                    └── 应用设置
```

---

## 页面组件说明

### Home.tsx - 首页

功能：
- 仪表板概览
- 快速入口
- 最近评估

### Calculator.tsx - 成本计算页面

**核心页面**，包含完整的计算流程。

功能：
- 三类维度输入
- 实时成本计算
- 多方案对比
- 结果可视化
- 导出/分享

### Evaluations.tsx - 评估历史

功能：
- 历史记录列表
- 搜索/筛选
- 详情查看
- 编辑/删除

### Settings.tsx - 设置页面

功能：
- 默认区域设置
- 主题配置
- 用户偏好

---

## 核心组件说明

### 输入组件

| 组件 | 功能 | 数据绑定 |
|------|------|---------|
| FunctionalForm | 功能维度表单 | device_count, recording_mode, video_quality, access_pattern, retention_days |
| TechnicalForm | 技术维度表单 | storage_class, lifecycle_policy |
| PricingForm | 价格维度表单 | region, discount_percent |
| ScenarioSelector | 预设场景选择 | 快速加载配置 |
| StorageStrategySelector | 存储策略选择 | Standard/Glacier/混合 |
| StageEditor | 生命周期阶段编辑 | 多阶段配置 |

### 展示组件

| 组件 | 功能 |
|------|------|
| CostBreakdownTable | 费用明细表格（6项费用） |
| CostPieChart | 费用占比饼图 |
| ComparisonChart | 多方案对比图表 |
| SensitivityAnalysis | 灵敏度分析热力图 |

### 交互组件

| 组件 | 功能 |
|------|------|
| MultiSchemePanel | 多方案管理（增/删/改） |
| ExportDialog | 导出 Excel/PDF |
| ShareDialog | 生成分享链接 |

---

## 数据流

### 计算流程

```
用户输入 (Forms)
    ↓
CostCalculationInput (TypeScript)
    ↓
API 调用 (fetch POST /calculate)
    ↓
CostSummary (响应)
    ↓
ResultDisplay (渲染)
    ├── CostBreakdownTable
    └── CostPieChart
```

### 状态管理

```
React Context / Hooks
├── useCalculate()     # 计算状态和方法
│   ├── input          # 当前输入
│   ├── result         # 计算结果
│   ├── loading        # 加载状态
│   └── calculate()    # 触发计算
│
├── useComparison()    # 对比状态
│   ├── configs[]      # 多个配置
│   ├── results[]      # 对比结果
│   └── compare()      # 触发对比
│
└── usePricing()       # 定价数据
    ├── regions[]      # 支持区域
    └── pricing        # 当前区域定价
```

---

## API 通信层

### client.ts - Axios 客户端配置

```typescript
const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})
```

### 服务模块

| 服务 | 方法 |
|------|------|
| calculate.ts | `calculateCost(input)` |
| compare.ts | `compareConfigs(configs[])`, `compareScenarios(ids[])` |
| evaluations.ts | `save()`, `list()`, `get()`, `update()`, `delete()` |
| shares.ts | `create()`, `get()`, `clone()`, `delete()` |
| export.ts | `exportExcel()`, `exportPDF()` |

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18+ |
| 语言 | TypeScript 5.9+ |
| UI 库 | Ant Design |
| 图表 | ECharts / Ant Design Charts |
| 路由 | React Router |
| HTTP | Axios |
| 构建 | Vite |

---

## 主题配置

**企业级稳重蓝色主题**（App.tsx）:

```typescript
const theme = {
  token: {
    colorPrimary: '#1890ff',  // 主色
    borderRadius: 6,
    // ...
  }
}
```

---

## 组件数量统计

| 类别 | 数量 |
|------|------|
| 页面组件 | 4 |
| 计算器组件 | 13 |
| 对比组件 | 3 |
| 分享组件 | 2 |
| 通用组件 | 1 |
| **总计** | **23** |
