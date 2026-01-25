# Research: IPC Case Cost Evaluator

**Date**: 2026-01-25
**Status**: Complete

## 技术决策汇总

### 1. 用户认证方案

**Decision**: JWT Token 认证 (python-jose + passlib)

**Rationale**:
- 无状态认证适合 API-First 架构
- 易于横向扩展，无需会话存储
- 前端 React 应用可直接在 localStorage 管理 Token
- 支持 Token 刷新机制延长用户会话

**Alternatives Considered**:
- Session-based 认证：需要 Redis 存储会话，增加运维复杂度
- OAuth 2.0 第三方登录：MVP 阶段不需要社交登录
- API Key：不适合终端用户认证场景

**Implementation Details**:
- Access Token 有效期：15 分钟（可配置）
- Refresh Token 有效期：7 天（可配置）
- 密码存储：bcrypt 哈希
- Token 算法：HS256

---

### 2. 数据存储方案

**Decision**: Amazon DynamoDB

**Rationale**:
- 与 AWS 生态一致，项目本身是 AWS 成本计算器
- Serverless 模式按需扩展，无运维负担
- 支持 TTL 自动过期（适合分享链接 7 天有效期）
- boto3 SDK 已在项目依赖中

**Alternatives Considered**:
- SQLite：零配置但不支持云端部署
- PostgreSQL：需要管理数据库实例
- MongoDB Atlas：增加额外云服务依赖

**Table Design**:
```
Table: ipc_evaluations
  PK: user_id
  SK: evaluation_id
  Attributes: name, input_params, result, created_at, updated_at

Table: ipc_shares
  PK: share_id (UUID)
  Attributes: evaluation_snapshot, created_at, expires_at (TTL)
  GSI: user_id-index (按用户查询分享)

Table: ipc_users
  PK: user_id (UUID)
  Attributes: email, password_hash, created_at
  GSI: email-index (登录查询)
```

---

### 3. Excel 导出方案

**Decision**: openpyxl 库

**Rationale**:
- 纯 Python 实现，无系统依赖
- 支持样式、图表、公式等高级特性
- 已在 requirements.txt 中声明
- 生成的 .xlsx 兼容 Excel 和 Google Sheets

**Alternatives Considered**:
- xlsxwriter：功能类似但不支持读取
- pandas to_excel：引入重型依赖
- CSV 导出：格式简单但不支持样式和图表

**Export Template**:
- Sheet 1: 参数配置（三维度参数明细）
- Sheet 2: 费用明细（各项费用分解）
- Sheet 3: 方案对比（多方案成本对比表）
- Sheet 4: 图表（费用构成饼图）

---

### 4. 敏感度分析算法

**Decision**: 单变量线性扫描 + 缓存优化

**Rationale**:
- 用户通过滑块调节单个参数，保持其他参数不变
- 线性扫描 (0.5x ~ 2.0x) 生成 21 个数据点
- 前端缓存结果减少重复计算

**Algorithm**:
```python
def sensitivity_analysis(base_params, param_name, range_factor=2.0, points=21):
    base_value = getattr(base_params, param_name)
    results = []
    for factor in np.linspace(1/range_factor, range_factor, points):
        modified_params = base_params.copy()
        setattr(modified_params, param_name, base_value * factor)
        cost = calculate(modified_params)
        results.append({
            "factor": factor,
            "value": base_value * factor,
            "cost": cost.monthly_total
        })
    return results
```

**Supported Parameters**:
- device_count (设备数量)
- retention_days (保留天数)
- access_pattern (回看比例)
- video_quality (视频质量 - 离散值)
- recording_mode (录像模式 - 离散值)

---

### 5. 生命周期模板设计

**Decision**: JSON 配置 + 可视化编辑器

**Rationale**:
- 预设模板以 JSON 存储，便于管理和扩展
- 前端提供阶段编辑器，支持拖拽调整
- 验证阶段连续性（无重叠、无间隙）

**Template Structure**:
```json
{
  "id": "medium_90_days",
  "name": "90 天中期模板",
  "description": "适合中型企业的标准存储策略",
  "total_days": 90,
  "stages": [
    {"storage_class": "STANDARD", "days": 14},
    {"storage_class": "GLACIER_IR", "days": 46},
    {"storage_class": "DEEP_ARCHIVE", "days": 30}
  ]
}
```

**Predefined Templates**:
1. **短期 30 天**：Standard 7 天 → Glacier IR 23 天
2. **中期 90 天**：Standard 14 天 → Glacier IR 46 天 → Deep Archive 30 天
3. **长期 365 天**：Standard 30 天 → Glacier IR 60 天 → Deep Archive 275 天

---

### 6. 前端状态管理

**Decision**: TanStack Query (React Query) + URL State

**Rationale**:
- TanStack Query 已在项目中使用，提供缓存和自动重试
- 计算参数存入 URL，支持分享和书签
- 无需引入 Redux 等重型状态库

**State Strategy**:
- **服务端状态**：TanStack Query 管理 API 响应缓存
- **URL 状态**：三维度参数编码到 URL query string
- **本地状态**：React useState 管理表单交互状态

---

### 7. 图表库选择

**Decision**: @ant-design/charts (基于 G2)

**Rationale**:
- 与 Ant Design 设计语言一致
- 已在项目依赖中
- 支持饼图、柱状图、折线图等所需图表类型

**Chart Types**:
- **费用构成**：环形饼图 (Pie/Donut)
- **方案对比**：分组柱状图 (Grouped Bar)
- **敏感度曲线**：折线图 (Line)

---

## 最佳实践采纳

### FastAPI 路由组织

遵循 Constitution 的 API 设计标准：
- 路由按功能模块拆分到独立文件
- 使用 APIRouter 前缀分组
- 统一的错误响应格式

```python
# app/api/routes/__init__.py
from fastapi import APIRouter
from .calculate import router as calculate_router
from .compare import router as compare_router
from .sensitivity import router as sensitivity_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(calculate_router, prefix="/calculate", tags=["计算"])
api_router.include_router(compare_router, prefix="/compare", tags=["对比"])
api_router.include_router(sensitivity_router, prefix="/sensitivity", tags=["敏感度"])
```

### Pydantic 模型验证

遵循 Constitution 的 Pydantic 数据模型优先原则：
- 输入模型使用 Field 定义约束
- 输出模型使用 computed_field 派生属性
- 枚举内嵌业务常量

```python
class SensitivityInput(BaseModel):
    base_params: CostCalculationInput
    param_name: Literal["device_count", "retention_days", "access_pattern"]
    range_factor: float = Field(default=2.0, ge=1.1, le=5.0)
    points: int = Field(default=21, ge=5, le=51)
```

---

## 未解决问题

无。所有技术决策已明确。
