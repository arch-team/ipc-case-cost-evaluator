# 核算记录对比功能设计

## 概述

在核算记录列表页面实现多记录对比功能，支持用户选择 2-4 条记录进行全量数据对比，帮助用户进行成本方案择优决策。

## 需求规格

| 需求项 | 规格 |
|--------|------|
| 对比数量 | 2-4 条记录 |
| 入口方式 | 复选框多选 + 对比按钮 |
| 展示形式 | 独立对比页面，URL 可分享 |
| 对比内容 | 全量明细（核心指标 + 输入参数 + 分阶段费用 + 定价快照） |
| 可视化 | 表格 + 柱状图 |
| 差异高亮 | 最低成本绿色，最高成本红色 |

## 架构设计

### 新增文件结构

```
frontend/src/
├── pages/
│   └── RecordComparison.tsx              # 对比页面
├── components/
│   └── comparison/                        # 对比组件目录
│       ├── CostSummaryComparison.tsx      # 费用汇总对比表格
│       ├── ComparisonChart.tsx            # 费用对比柱状图
│       ├── MetricsComparison.tsx          # 中间指标对比
│       ├── StageDetailsComparison.tsx     # 分阶段费用对比
│       ├── InputParamsComparison.tsx      # 输入参数对比
│       └── PricingComparison.tsx          # 定价信息对比
├── api/
│   └── calculationRecords.ts              # 修改：新增批量获取方法

backend/app/
├── api/routes/
│   └── calculation_records.py             # 修改：新增批量获取端点
├── db/repositories/
│   └── calculation_records.py             # 修改：新增 get_batch 方法
```

### 路由设计

```
/calculation-records/comparison?ids=record1,record2,record3
```

### 数据流

```
列表页选中记录 → 点击对比按钮 → 跳转对比页面（URL 带 ids）
    → 对比页面解析 URL → 调用批量获取 API → 前端渲染对比结果
```

## 详细设计

### 1. 列表页改造

#### 新增状态

```typescript
const [selectedIds, setSelectedIds] = useState<string[]>([]);
```

#### 表格新增复选框列

```typescript
const columns = [
  {
    title: '',
    key: 'selection',
    width: 50,
    render: (_, record) => (
      <Checkbox
        checked={selectedIds.includes(record.record_id)}
        onChange={(e) => handleSelect(record.record_id, e.target.checked)}
        disabled={!selectedIds.includes(record.record_id) && selectedIds.length >= 4}
      />
    ),
  },
  // ... 原有列
];
```

#### 对比按钮区域

```typescript
<Space>
  <Button
    type="primary"
    icon={<SwapOutlined />}
    disabled={selectedIds.length < 2}
    onClick={handleCompare}
  >
    对比 {selectedIds.length > 0 && `(${selectedIds.length})`}
  </Button>
  {selectedIds.length > 0 && (
    <Button onClick={() => setSelectedIds([])}>
      清除选择
    </Button>
  )}
</Space>
```

#### 交互规则

- 选中 0-1 条：对比按钮禁用
- 选中 2-4 条：对比按钮可用
- 选中 4 条后：其他复选框禁用

### 2. 后端批量获取 API

#### 新增端点

```python
@router.get(
    "/calculation-records/batch",
    response_model=List[CalculationRecord],
    summary="批量获取核算记录",
    description="根据记录 ID 列表批量获取完整记录，用于对比功能",
)
def get_records_batch(
    ids: str = Query(..., description="逗号分隔的记录 ID，2-4 个"),
    current_user: dict = Depends(get_current_user),
):
    """批量获取核算记录"""
    id_list = [id.strip() for id in ids.split(",") if id.strip()]

    if len(id_list) < 2 or len(id_list) > 4:
        raise HTTPException(
            status_code=400,
            detail="请选择 2-4 条记录进行对比",
        )

    repo = CalculationRecordRepository()
    records = repo.get_batch(user_id=current_user["id"], record_ids=id_list)

    if len(records) != len(id_list):
        raise HTTPException(
            status_code=404,
            detail="部分记录不存在或无权访问",
        )

    return records
```

#### Repository 层新增方法

```python
def get_batch(self, user_id: str, record_ids: List[str]) -> List[CalculationRecord]:
    """批量获取记录"""
    records = []
    for record_id in record_ids:
        record = self.get(user_id=user_id, record_id=record_id)
        if record:
            records.append(record)
    return records
```

### 3. 对比页面结构

```typescript
const RecordComparison: React.FC = () => {
  const [searchParams] = useSearchParams();
  const ids = searchParams.get('ids')?.split(',') || [];

  const [records, setRecords] = useState<CalculationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  return (
    <div>
      {/* 页面标题 */}
      <Card style={{ marginBottom: 16 }}>
        <Title level={4}>
          <SwapOutlined /> 核算记录对比
        </Title>
        <Space>
          {records.map((r, i) => (
            <Tag color={COLORS[i]} key={r.record_id}>{r.name}</Tag>
          ))}
        </Space>
      </Card>

      {/* 1. 费用汇总对比 + 柱状图 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={14}>
          <CostSummaryComparison records={records} />
        </Col>
        <Col span={10}>
          <ComparisonChart records={records} />
        </Col>
      </Row>

      {/* 2. 中间指标对比 */}
      <Card title="📊 计算过程对比" style={{ marginBottom: 16 }}>
        <MetricsComparison records={records} />
      </Card>

      {/* 3. 分阶段费用明细对比 */}
      <Card title="📋 分阶段费用明细对比" style={{ marginBottom: 16 }}>
        <StageDetailsComparison records={records} />
      </Card>

      {/* 4. 输入参数对比 */}
      <Card title="⚙️ 输入参数对比" style={{ marginBottom: 16 }}>
        <InputParamsComparison records={records} />
      </Card>

      {/* 5. 定价信息对比 */}
      <Card title="💰 定价信息对比">
        <PricingComparison records={records} />
      </Card>
    </div>
  );
};
```

### 4. 颜色高亮工具函数

```typescript
const getValueColor = (value: number, allValues: number[], isLowerBetter = true) => {
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  if (allValues.length < 2 || min === max) return undefined;

  if (isLowerBetter) {
    if (value === min) return '#52c41a'; // 绿色：最低（最优）
    if (value === max) return '#ff4d4f'; // 红色：最高（最差）
  }
  return undefined;
};
```

### 5. 费用汇总对比表格

对比项：
- 记录名称
- 存储策略
- 月度总成本
- 存储费用
- PUT 请求费用
- GET 请求费用
- 检索费用
- 生命周期转换费用
- 数据传输费用
- 单设备成本
- 单 GB 成本

### 6. 中间指标对比

#### 数据量指标
- 每日录像时长（小时）
- 每日数据量（GB）
- 月度数据量（GB）
- 平均存储量（GB）

#### 请求数指标
- 每日分片数
- 月度 PUT 请求（K）
- 月度 GET 请求（K）
- 月度检索量（GB）
- 月度传输量（GB）

### 7. 分阶段费用明细对比

按阶段 Tab 切换展示：
- 阶段信息：存储类型、时间范围、访问率
- 费用明细：存储费用、PUT请求、GET请求、检索费用、转换费用、数据传输、阶段小计
- 格式：单价 × 用量 = 金额

### 8. 输入参数对比

#### 功能维度
- 设备数量
- 录像模式
- 视频质量
- 保留天数
- 每日事件数
- 事件时长
- 回看比例

#### 技术维度
- 存储类型
- 分片策略
- 分片时长
- 生命周期启用状态

### 9. 定价信息对比

- AWS 区域
- 折扣百分比
- 定价日期
- 存储单价
- PUT 请求单价
- GET 请求单价

### 10. 费用对比柱状图

- 分组柱状图：按费用类型分组，每条记录一个柱子
- 总成本进度条：直观展示各记录总成本差异，最低成本绿色高亮

### 11. 前端 API 新增方法

```typescript
export const calculationRecordApi = {
  getBatch: async (ids: string[]): Promise<CalculationRecord[]> => {
    const response = await apiClient.get('/calculation-records/batch', {
      params: { ids: ids.join(',') },
    });
    return response.data;
  },
};
```

### 12. 路由配置

```typescript
<Route
  path="/calculation-records/comparison"
  element={<RecordComparison />}
/>
```

## 实现优先级

1. **P0 - 核心功能**
   - 列表页复选框和对比按钮
   - 后端批量获取 API
   - 对比页面基础结构
   - 费用汇总对比表格

2. **P1 - 完整对比**
   - 中间指标对比
   - 分阶段费用对比
   - 输入参数对比
   - 定价信息对比

3. **P2 - 可视化增强**
   - 费用对比柱状图
   - 总成本进度条
   - 颜色高亮优化

## 注意事项

1. URL 参数中的记录 ID 需要进行 URL 编码
2. 批量获取时验证用户权限，确保只能访问自己的记录
3. 不同存储策略的阶段数量不同，需要优雅处理无此阶段的情况
4. 图表库使用 @ant-design/charts，需确认项目已安装
