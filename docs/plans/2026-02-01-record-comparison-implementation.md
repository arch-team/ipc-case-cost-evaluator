# 核算记录对比功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在核算记录列表页面实现多记录对比功能，支持 2-4 条记录的全量数据对比。

**Architecture:** 前端对比 + 批量获取 API 方案。列表页添加复选框多选，跳转独立对比页面，通过 URL 参数传递记录 ID，前端批量获取记录后进行对比渲染。

**Tech Stack:** React + TypeScript + Ant Design + @ant-design/charts (已安装) | FastAPI + Pydantic

---

## Task 1: 后端 - Repository 层新增批量获取方法

**Files:**
- Modify: `backend/app/db/repositories/calculation_records.py:172` (在 count_by_user 方法后)

**Step 1: 添加 get_batch 方法**

在 `CalculationRecordRepository` 类中添加批量获取方法：

```python
def get_batch(self, user_id: str, record_ids: List[str]) -> List[CalculationRecord]:
    """批量获取记录

    Args:
        user_id: 用户 ID
        record_ids: 记录 ID 列表

    Returns:
        核算记录列表（保持传入顺序）
    """
    records = []
    for record_id in record_ids:
        record = self.get(user_id=user_id, record_id=record_id)
        if record:
            records.append(record)
    return records
```

**Step 2: 验证代码无语法错误**

Run: `cd backend && python -c "from app.db.repositories.calculation_records import CalculationRecordRepository; print('OK')"`
Expected: OK

**Step 3: Commit**

```bash
git add backend/app/db/repositories/calculation_records.py
git commit -m "feat(004): Repository 层添加批量获取记录方法 get_batch"
```

---

## Task 2: 后端 - API 层新增批量获取端点

**Files:**
- Modify: `backend/app/api/routes/calculation_records.py:270` (在 get_record_count 方法前)

**Step 1: 添加批量获取端点**

在 `get_record_count` 函数前添加新端点：

```python
@router.get(
    "/calculation-records/batch",
    response_model=List[CalculationRecord],
    summary="批量获取核算记录",
    description="根据记录 ID 列表批量获取完整记录，用于对比功能。支持 2-4 条记录。",
)
def get_records_batch(
    ids: str = Query(..., description="逗号分隔的记录 ID，2-4 个"),
    current_user: dict = Depends(get_current_user),
):
    """批量获取核算记录"""
    logger.info(
        "批量获取核算记录: user_id=%s, ids=%s",
        current_user["id"],
        ids,
    )

    # 解析并验证 ID 列表
    id_list = [id.strip() for id in ids.split(",") if id.strip()]

    if len(id_list) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请至少选择 2 条记录进行对比",
        )

    if len(id_list) > 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="最多支持 4 条记录对比",
        )

    # 检查重复 ID
    if len(id_list) != len(set(id_list)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="记录 ID 不能重复",
        )

    # 批量获取记录
    repo = CalculationRecordRepository()
    records = repo.get_batch(user_id=current_user["id"], record_ids=id_list)

    # 验证是否全部找到
    if len(records) != len(id_list):
        found_ids = {r.record_id for r in records}
        missing_ids = [id for id in id_list if id not in found_ids]
        logger.warning("部分记录不存在: missing=%s", missing_ids)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="部分记录不存在或无权访问",
        )

    logger.info("批量获取成功: count=%d", len(records))
    return records
```

**Step 2: 添加 List 导入**

在文件顶部导入 `List`：

```python
from typing import List, Optional
```

**Step 3: 启动服务验证端点**

Run: `cd backend && python -c "from app.api.routes.calculation_records import router; print('Routes OK')"`
Expected: Routes OK

**Step 4: Commit**

```bash
git add backend/app/api/routes/calculation_records.py
git commit -m "feat(004): API 层添加批量获取核算记录端点 /calculation-records/batch"
```

---

## Task 3: 前端 - API 层新增批量获取方法

**Files:**
- Modify: `frontend/src/api/calculationRecords.ts:95` (在 getCount 方法后)

**Step 1: 添加 getBatch 方法**

在 `calculationRecordApi` 对象中添加：

```typescript
/**
 * 批量获取核算记录（用于对比）
 * @param ids 记录 ID 数组（2-4 个）
 */
getBatch: async (ids: string[]): Promise<CalculationRecord[]> => {
  const response = await apiClient.get<CalculationRecord[]>(
    '/calculation-records/batch',
    { params: { ids: ids.join(',') } }
  );
  return response.data;
},
```

**Step 2: 验证 TypeScript 编译**

Run: `cd frontend && npx tsc --noEmit src/api/calculationRecords.ts`
Expected: 无错误输出

**Step 3: Commit**

```bash
git add frontend/src/api/calculationRecords.ts
git commit -m "feat(004): 前端 API 添加批量获取核算记录方法 getBatch"
```

---

## Task 4: 前端 - 对比工具函数

**Files:**
- Create: `frontend/src/utils/comparisonHelpers.ts`

**Step 1: 创建对比工具函数文件**

```typescript
/**
 * 核算记录对比工具函数
 */

// 记录对应的颜色
export const RECORD_COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d'];

/**
 * 获取数值对应的高亮颜色
 * @param value 当前值
 * @param allValues 所有对比值
 * @param isLowerBetter 是否越低越好（默认 true，成本类指标）
 * @returns 颜色值或 undefined
 */
export const getValueColor = (
  value: number,
  allValues: number[],
  isLowerBetter = true
): string | undefined => {
  const validValues = allValues.filter((v) => v !== undefined && v !== null && !isNaN(v));
  if (validValues.length < 2) return undefined;

  const min = Math.min(...validValues);
  const max = Math.max(...validValues);

  if (min === max) return undefined;

  if (isLowerBetter) {
    if (value === min) return '#52c41a'; // 绿色：最低（最优）
    if (value === max) return '#ff4d4f'; // 红色：最高（最差）
  } else {
    if (value === max) return '#52c41a'; // 绿色：最高（最优）
    if (value === min) return '#ff4d4f'; // 红色：最低（最差）
  }
  return undefined;
};

/**
 * 格式化数值显示
 * @param value 数值
 * @param decimals 小数位数
 * @param prefix 前缀（如 $）
 * @param suffix 后缀（如 GB）
 */
export const formatComparisonValue = (
  value: number | undefined | null,
  decimals = 4,
  prefix = '',
  suffix = ''
): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '-';
  }
  return `${prefix}${value.toFixed(decimals)}${suffix}`;
};

/**
 * 检查参数值是否相同
 * @param values 所有记录的值
 * @returns 是否全部相同
 */
export const areValuesEqual = (values: (string | number | boolean | undefined)[]): boolean => {
  const validValues = values.filter((v) => v !== undefined && v !== null);
  if (validValues.length < 2) return true;
  return validValues.every((v) => v === validValues[0]);
};
```

**Step 2: 验证 TypeScript 编译**

Run: `cd frontend && npx tsc --noEmit src/utils/comparisonHelpers.ts`
Expected: 无错误输出

**Step 3: Commit**

```bash
git add frontend/src/utils/comparisonHelpers.ts
git commit -m "feat(004): 添加核算记录对比工具函数"
```

---

## Task 5: 前端 - 费用汇总对比组件

**Files:**
- Create: `frontend/src/components/comparison/CostSummaryComparison.tsx`

**Step 1: 创建组件目录和文件**

```typescript
/**
 * 费用汇总对比表格组件
 */
import React from 'react';
import { Table, Typography, Tag } from 'antd';
import type { CalculationRecord } from '../../types/calculationRecords';
import { RECORD_COLORS, getValueColor, formatComparisonValue } from '../../utils/comparisonHelpers';
import { formatNumber } from '../../utils/formatters';
import {
  STORAGE_STRATEGY_NAMES,
  STORAGE_STRATEGY_COLORS,
} from '../../constants/storageStrategies';

const { Text } = Typography;

interface Props {
  records: CalculationRecord[];
}

interface RowData {
  key: string;
  label: string;
  isNumeric: boolean;
  isCost: boolean;
  values: (string | number)[];
}

const CostSummaryComparison: React.FC<Props> = ({ records }) => {
  // 定义对比行
  const rows: RowData[] = [
    {
      key: 'name',
      label: '记录名称',
      isNumeric: false,
      isCost: false,
      values: records.map((r) => r.name),
    },
    {
      key: 'strategy',
      label: '存储策略',
      isNumeric: false,
      isCost: false,
      values: records.map((r) => r.storage_strategy),
    },
    {
      key: 'total_cost',
      label: '月度总成本',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.total_cost),
    },
    {
      key: 'storage_cost',
      label: '存储费用',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.storage_cost),
    },
    {
      key: 'put_request_cost',
      label: 'PUT 请求费用',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.put_request_cost),
    },
    {
      key: 'get_request_cost',
      label: 'GET 请求费用',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.get_request_cost),
    },
    {
      key: 'retrieval_cost',
      label: '检索费用',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.retrieval_cost),
    },
    {
      key: 'lifecycle_cost',
      label: '生命周期转换费用',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.lifecycle_cost),
    },
    {
      key: 'data_transfer_cost',
      label: '数据传输费用',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.data_transfer_cost),
    },
    {
      key: 'cost_per_device',
      label: '单设备成本',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.cost_per_device),
    },
    {
      key: 'cost_per_gb',
      label: '单 GB 成本',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.cost_per_gb),
    },
  ];

  // 动态列
  const columns = [
    {
      title: '对比项',
      dataIndex: 'label',
      key: 'label',
      width: 160,
      fixed: 'left' as const,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    ...records.map((record, idx) => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: RECORD_COLORS[idx],
            display: 'inline-block',
            marginRight: 8,
          }} />
          {record.name}
        </div>
      ),
      dataIndex: `value_${idx}`,
      key: `value_${idx}`,
      align: 'right' as const,
      render: (_: unknown, row: RowData) => {
        const value = row.values[idx];

        // 存储策略特殊处理
        if (row.key === 'strategy') {
          const strategy = value as string;
          return (
            <Tag color={STORAGE_STRATEGY_COLORS[strategy]}>
              {STORAGE_STRATEGY_NAMES[strategy] || strategy}
            </Tag>
          );
        }

        // 非数值直接显示
        if (!row.isNumeric) {
          return <Text>{value}</Text>;
        }

        // 数值类型：计算颜色
        const numValue = value as number;
        const allNumValues = row.values as number[];
        const color = row.isCost ? getValueColor(numValue, allNumValues, true) : undefined;

        return (
          <Text style={{ color }} strong={!!color}>
            ${formatNumber(numValue, 4)}
          </Text>
        );
      },
    })),
  ];

  // 构建表格数据
  const dataSource = rows.map((row) => ({
    ...row,
    ...records.reduce((acc, _, idx) => ({
      ...acc,
      [`value_${idx}`]: row.values[idx],
    }), {}),
  }));

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      pagination={false}
      size="small"
      bordered
      scroll={{ x: 'max-content' }}
    />
  );
};

export default CostSummaryComparison;
```

**Step 2: 验证 TypeScript 编译**

Run: `cd frontend && npx tsc --noEmit src/components/comparison/CostSummaryComparison.tsx`
Expected: 无错误输出

**Step 3: Commit**

```bash
git add frontend/src/components/comparison/CostSummaryComparison.tsx
git commit -m "feat(004): 添加费用汇总对比表格组件"
```

---

## Task 6: 前端 - 费用对比柱状图组件

**Files:**
- Create: `frontend/src/components/comparison/ComparisonChart.tsx`

**Step 1: 创建柱状图组件**

```typescript
/**
 * 费用对比柱状图组件
 */
import React from 'react';
import { Card, Typography, Progress } from 'antd';
import { Column } from '@ant-design/charts';
import type { CalculationRecord } from '../../types/calculationRecords';
import { RECORD_COLORS, getValueColor } from '../../utils/comparisonHelpers';
import { formatNumber } from '../../utils/formatters';

const { Title, Text } = Typography;

interface Props {
  records: CalculationRecord[];
}

const ComparisonChart: React.FC<Props> = ({ records }) => {
  // 构建图表数据
  const chartData = records.flatMap((record, idx) => [
    { record: record.name, category: '存储', value: record.cost_summary.storage_cost, color: RECORD_COLORS[idx] },
    { record: record.name, category: 'PUT请求', value: record.cost_summary.put_request_cost, color: RECORD_COLORS[idx] },
    { record: record.name, category: 'GET请求', value: record.cost_summary.get_request_cost, color: RECORD_COLORS[idx] },
    { record: record.name, category: '检索', value: record.cost_summary.retrieval_cost, color: RECORD_COLORS[idx] },
    { record: record.name, category: '转换', value: record.cost_summary.lifecycle_cost, color: RECORD_COLORS[idx] },
    { record: record.name, category: '传输', value: record.cost_summary.data_transfer_cost, color: RECORD_COLORS[idx] },
  ]);

  const config = {
    data: chartData,
    xField: 'category',
    yField: 'value',
    seriesField: 'record',
    isGroup: true,
    columnStyle: { radius: [4, 4, 0, 0] },
    label: {
      position: 'top' as const,
      formatter: (datum: { value: number }) => `$${datum.value.toFixed(2)}`,
      style: { fontSize: 10 },
    },
    yAxis: {
      label: { formatter: (v: string) => `$${v}` },
    },
    legend: { position: 'top' as const },
    tooltip: {
      formatter: (datum: { record: string; value: number }) => ({
        name: datum.record,
        value: `$${datum.value.toFixed(4)}`,
      }),
    },
    color: RECORD_COLORS.slice(0, records.length),
  };

  // 计算总成本相关数据
  const totalCosts = records.map((r) => r.cost_summary.total_cost);
  const maxCost = Math.max(...totalCosts);
  const minCost = Math.min(...totalCosts);

  return (
    <Card title="费用构成对比" size="small">
      <Column {...config} height={280} />

      {/* 总成本对比条 */}
      <div style={{ marginTop: 16 }}>
        <Title level={5} style={{ marginBottom: 12 }}>月度总成本</Title>
        {records.map((r, i) => {
          const percent = maxCost > 0 ? (r.cost_summary.total_cost / maxCost) * 100 : 0;
          const isMin = r.cost_summary.total_cost === minCost && records.length > 1;
          const isMax = r.cost_summary.total_cost === maxCost && records.length > 1 && minCost !== maxCost;

          return (
            <div key={r.record_id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: RECORD_COLORS[i],
                      marginRight: 8,
                    }}
                  />
                  {r.name}
                </Text>
                <Text
                  strong
                  style={{ color: isMin ? '#52c41a' : isMax ? '#ff4d4f' : undefined }}
                >
                  ${formatNumber(r.cost_summary.total_cost, 4)}
                </Text>
              </div>
              <Progress
                percent={percent}
                showInfo={false}
                strokeColor={isMin ? '#52c41a' : RECORD_COLORS[i]}
                size="small"
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ComparisonChart;
```

**Step 2: 验证 TypeScript 编译**

Run: `cd frontend && npx tsc --noEmit src/components/comparison/ComparisonChart.tsx`
Expected: 无错误输出

**Step 3: Commit**

```bash
git add frontend/src/components/comparison/ComparisonChart.tsx
git commit -m "feat(004): 添加费用对比柱状图组件"
```

---

## Task 7: 前端 - 中间指标对比组件

**Files:**
- Create: `frontend/src/components/comparison/MetricsComparison.tsx`

**Step 1: 创建中间指标对比组件**

```typescript
/**
 * 中间指标对比组件
 */
import React from 'react';
import { Row, Col, Table, Typography } from 'antd';
import type { CalculationRecord } from '../../types/calculationRecords';
import { RECORD_COLORS } from '../../utils/comparisonHelpers';
import { formatNumber } from '../../utils/formatters';

const { Title, Text } = Typography;

interface Props {
  records: CalculationRecord[];
}

interface MetricRow {
  key: string;
  label: string;
  unit: string;
  getValue: (r: CalculationRecord) => number;
  decimals?: number;
}

const MetricsComparison: React.FC<Props> = ({ records }) => {
  // 数据量指标
  const dataMetrics: MetricRow[] = [
    {
      key: 'daily_recording',
      label: '每日录像时长',
      unit: '小时',
      getValue: (r) => r.intermediate_metrics.daily_recording_seconds / 3600,
      decimals: 2,
    },
    {
      key: 'daily_data_gb',
      label: '每日数据量',
      unit: 'GB',
      getValue: (r) => r.intermediate_metrics.daily_data_gb,
      decimals: 4,
    },
    {
      key: 'monthly_data_gb',
      label: '月度数据量',
      unit: 'GB',
      getValue: (r) => r.intermediate_metrics.monthly_data_gb,
      decimals: 2,
    },
    {
      key: 'avg_storage_gb',
      label: '平均存储量',
      unit: 'GB',
      getValue: (r) => r.intermediate_metrics.avg_storage_gb,
      decimals: 2,
    },
  ];

  // 请求数指标
  const requestMetrics: MetricRow[] = [
    {
      key: 'segments_per_day',
      label: '每日分片数',
      unit: '个',
      getValue: (r) => r.intermediate_metrics.segments_per_day,
      decimals: 0,
    },
    {
      key: 'monthly_puts',
      label: '月度 PUT 请求',
      unit: 'K',
      getValue: (r) => r.intermediate_metrics.monthly_puts / 1000,
      decimals: 2,
    },
    {
      key: 'monthly_gets',
      label: '月度 GET 请求',
      unit: 'K',
      getValue: (r) => r.intermediate_metrics.monthly_gets / 1000,
      decimals: 2,
    },
    {
      key: 'monthly_retrieval',
      label: '月度检索量',
      unit: 'GB',
      getValue: (r) => r.intermediate_metrics.monthly_retrieval_gb,
      decimals: 2,
    },
    {
      key: 'monthly_transfer',
      label: '月度传输量',
      unit: 'GB',
      getValue: (r) => r.intermediate_metrics.monthly_transfer_gb,
      decimals: 2,
    },
  ];

  // 构建表格列
  const buildColumns = () => [
    {
      title: '指标',
      dataIndex: 'label',
      key: 'label',
      width: 140,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    ...records.map((record, idx) => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: RECORD_COLORS[idx],
              marginRight: 8,
            }}
          />
          {record.name}
        </div>
      ),
      dataIndex: `value_${idx}`,
      key: `value_${idx}`,
      align: 'right' as const,
    })),
  ];

  // 构建表格数据
  const buildDataSource = (metrics: MetricRow[]) =>
    metrics.map((metric) => ({
      key: metric.key,
      label: metric.label,
      ...records.reduce(
        (acc, record, idx) => ({
          ...acc,
          [`value_${idx}`]: `${formatNumber(metric.getValue(record), metric.decimals ?? 2)} ${metric.unit}`,
        }),
        {}
      ),
    }));

  return (
    <Row gutter={24}>
      <Col span={12}>
        <Title level={5} style={{ marginBottom: 12 }}>📁 数据量指标</Title>
        <Table
          dataSource={buildDataSource(dataMetrics)}
          columns={buildColumns()}
          pagination={false}
          size="small"
          bordered
        />
      </Col>
      <Col span={12}>
        <Title level={5} style={{ marginBottom: 12 }}>🔄 请求数指标</Title>
        <Table
          dataSource={buildDataSource(requestMetrics)}
          columns={buildColumns()}
          pagination={false}
          size="small"
          bordered
        />
      </Col>
    </Row>
  );
};

export default MetricsComparison;
```

**Step 2: 验证 TypeScript 编译**

Run: `cd frontend && npx tsc --noEmit src/components/comparison/MetricsComparison.tsx`
Expected: 无错误输出

**Step 3: Commit**

```bash
git add frontend/src/components/comparison/MetricsComparison.tsx
git commit -m "feat(004): 添加中间指标对比组件"
```

---

## Task 8: 前端 - 分阶段费用对比组件

**Files:**
- Create: `frontend/src/components/comparison/StageDetailsComparison.tsx`

**Step 1: 创建分阶段费用对比组件**

```typescript
/**
 * 分阶段费用明细对比组件
 */
import React from 'react';
import { Tabs, Table, Descriptions, Typography, Tag, Empty } from 'antd';
import type { CalculationRecord, StageCostDetail, CostItemDetail } from '../../types/calculationRecords';
import { RECORD_COLORS, getValueColor } from '../../utils/comparisonHelpers';
import { formatNumber } from '../../utils/formatters';

const { Text } = Typography;

interface Props {
  records: CalculationRecord[];
}

// 费用项定义
const COST_ITEMS = [
  { key: 'storage_cost', label: '存储费用', field: 'storage_cost' },
  { key: 'put_request_cost', label: 'PUT 请求费用', field: 'put_request_cost' },
  { key: 'get_request_cost', label: 'GET 请求费用', field: 'get_request_cost' },
  { key: 'retrieval_cost', label: '检索费用', field: 'retrieval_cost', optional: true },
  { key: 'transition_cost', label: '转换费用', field: 'transition_cost', optional: true },
  { key: 'data_transfer_cost', label: '数据传输费用', field: 'data_transfer_cost', optional: true },
  { key: 'stage_total', label: '阶段小计', field: 'stage_total', isTotal: true },
];

// 格式化费用项显示
const formatCostItem = (item: CostItemDetail | undefined): string => {
  if (!item || item.amount === 0) return '-';
  return `$${formatNumber(item.amount, 4)}`;
};

// 格式化费用项详情（单价 × 用量 = 金额）
const formatCostItemDetail = (item: CostItemDetail | undefined): React.ReactNode => {
  if (!item || item.amount === 0) return <Text type="secondary">-</Text>;
  return (
    <div>
      <div><Text strong>${formatNumber(item.amount, 4)}</Text></div>
      <div style={{ fontSize: 12, color: '#888' }}>
        {formatNumber(item.unit_price, 6)} {item.unit_price_unit} × {formatNumber(item.quantity, 2)} {item.quantity_unit}
      </div>
    </div>
  );
};

const StageDetailsComparison: React.FC<Props> = ({ records }) => {
  // 找出最大阶段数
  const maxStages = Math.max(...records.map((r) => r.stage_details.length));

  if (maxStages === 0) {
    return <Empty description="无阶段费用数据" />;
  }

  // 构建表格列
  const buildColumns = (stageIdx: number) => [
    {
      title: '费用项',
      dataIndex: 'label',
      key: 'label',
      width: 140,
      render: (text: string, row: { isTotal?: boolean }) => (
        <Text strong={row.isTotal}>{text}</Text>
      ),
    },
    ...records.map((record, idx) => {
      const stage = record.stage_details[stageIdx];
      return {
        title: (
          <div style={{ textAlign: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: RECORD_COLORS[idx],
                marginRight: 8,
              }}
            />
            {record.name}
          </div>
        ),
        dataIndex: `value_${idx}`,
        key: `value_${idx}`,
        align: 'right' as const,
        render: (_: unknown, row: { key: string; isTotal?: boolean }) => {
          if (!stage) return <Text type="secondary">-</Text>;

          if (row.key === 'stage_total') {
            const allValues = records
              .map((r) => r.stage_details[stageIdx]?.stage_total)
              .filter((v): v is number => v !== undefined);
            const color = getValueColor(stage.stage_total, allValues);
            return (
              <Text strong style={{ color }}>
                ${formatNumber(stage.stage_total, 4)}
              </Text>
            );
          }

          const costItem = stage[row.key as keyof StageCostDetail] as CostItemDetail | undefined;
          return formatCostItemDetail(costItem);
        },
      };
    }),
  ];

  // 构建表格数据
  const buildDataSource = () =>
    COST_ITEMS.map((item) => ({
      key: item.key,
      label: item.label,
      isTotal: item.isTotal,
    }));

  // Tab 项
  const tabItems = Array.from({ length: maxStages }, (_, stageIdx) => ({
    key: String(stageIdx),
    label: `阶段 ${stageIdx + 1}`,
    children: (
      <div>
        {/* 阶段基本信息 */}
        <Descriptions size="small" column={records.length} bordered style={{ marginBottom: 16 }}>
          {records.map((r, i) => {
            const stage = r.stage_details[stageIdx];
            return (
              <Descriptions.Item
                key={r.record_id}
                label={
                  <span>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: RECORD_COLORS[i],
                        marginRight: 8,
                      }}
                    />
                    {r.name}
                  </span>
                }
              >
                {stage ? (
                  <div>
                    <Tag color="blue">{stage.storage_class}</Tag>
                    <span style={{ marginLeft: 8 }}>
                      第 {stage.start_day}-{stage.end_day} 天
                    </span>
                    <span style={{ marginLeft: 8, color: '#888' }}>
                      访问率 {((stage.access_rate ?? 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <Text type="secondary">无此阶段</Text>
                )}
              </Descriptions.Item>
            );
          })}
        </Descriptions>

        {/* 费用明细表格 */}
        <Table
          dataSource={buildDataSource()}
          columns={buildColumns(stageIdx)}
          pagination={false}
          size="small"
          bordered
        />
      </div>
    ),
  }));

  return <Tabs defaultActiveKey="0" items={tabItems} />;
};

export default StageDetailsComparison;
```

**Step 2: 验证 TypeScript 编译**

Run: `cd frontend && npx tsc --noEmit src/components/comparison/StageDetailsComparison.tsx`
Expected: 无错误输出

**Step 3: Commit**

```bash
git add frontend/src/components/comparison/StageDetailsComparison.tsx
git commit -m "feat(004): 添加分阶段费用对比组件"
```

---

## Task 9: 前端 - 输入参数对比组件

**Files:**
- Create: `frontend/src/components/comparison/InputParamsComparison.tsx`

**Step 1: 创建输入参数对比组件**

```typescript
/**
 * 输入参数对比组件
 */
import React from 'react';
import { Row, Col, Table, Typography, Tag } from 'antd';
import type { CalculationRecord } from '../../types/calculationRecords';
import { RECORD_COLORS, areValuesEqual } from '../../utils/comparisonHelpers';

const { Title, Text } = Typography;

interface Props {
  records: CalculationRecord[];
}

// 录像模式显示名称
const RECORDING_MODE_NAMES: Record<string, string> = {
  event_triggered: '事件触发',
  continuous: '7x24 连续',
  scheduled: '定时录像',
};

// 视频质量显示名称
const VIDEO_QUALITY_NAMES: Record<string, string> = {
  '2k': '2K (2560×1440)',
  '1080p': '1080P (1920×1080)',
  '720p': '720P (1280×720)',
  '480p': '480P (854×480)',
};

// 分片策略显示名称
const SEGMENT_STRATEGY_NAMES: Record<string, string> = {
  time_based: '按时间分片',
  size_based: '按大小分片',
};

const InputParamsComparison: React.FC<Props> = ({ records }) => {
  // 功能维度参数
  const functionalParams = [
    {
      key: 'device_count',
      label: '设备数量',
      getValue: (r: CalculationRecord) => `${r.input_params.functional.device_count} 台`,
    },
    {
      key: 'recording_mode',
      label: '录像模式',
      getValue: (r: CalculationRecord) =>
        RECORDING_MODE_NAMES[r.input_params.functional.recording_mode] ||
        r.input_params.functional.recording_mode,
    },
    {
      key: 'video_quality',
      label: '视频质量',
      getValue: (r: CalculationRecord) =>
        VIDEO_QUALITY_NAMES[r.input_params.functional.video_quality] ||
        r.input_params.functional.video_quality,
    },
    {
      key: 'retention_days',
      label: '保留天数',
      getValue: (r: CalculationRecord) => `${r.input_params.functional.retention_days} 天`,
    },
    {
      key: 'events_per_day',
      label: '每日事件数',
      getValue: (r: CalculationRecord) =>
        r.input_params.functional.events_per_day
          ? `${r.input_params.functional.events_per_day} 次`
          : '-',
    },
    {
      key: 'event_duration',
      label: '事件时长',
      getValue: (r: CalculationRecord) =>
        r.input_params.functional.event_duration_seconds
          ? `${r.input_params.functional.event_duration_seconds} 秒`
          : '-',
    },
    {
      key: 'access_pattern',
      label: '回看比例',
      getValue: (r: CalculationRecord) =>
        `${(r.input_params.functional.access_pattern * 100).toFixed(1)}%`,
    },
  ];

  // 技术维度参数
  const technicalParams = [
    {
      key: 'storage_class',
      label: '存储类型',
      getValue: (r: CalculationRecord) => r.input_params.technical.storage_class,
    },
    {
      key: 'segment_strategy',
      label: '分片策略',
      getValue: (r: CalculationRecord) =>
        SEGMENT_STRATEGY_NAMES[r.input_params.technical.segment_strategy] ||
        r.input_params.technical.segment_strategy,
    },
    {
      key: 'segment_seconds',
      label: '分片时长',
      getValue: (r: CalculationRecord) =>
        r.input_params.technical.segment_seconds
          ? `${r.input_params.technical.segment_seconds} 秒`
          : '-',
    },
    {
      key: 'lifecycle_enabled',
      label: '生命周期',
      getValue: (r: CalculationRecord) =>
        r.input_params.technical.lifecycle_enabled ? '已启用' : '未启用',
      isTag: true,
    },
  ];

  // 构建表格列
  const buildColumns = () => [
    {
      title: '参数',
      dataIndex: 'label',
      key: 'label',
      width: 120,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    ...records.map((record, idx) => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: RECORD_COLORS[idx],
              marginRight: 8,
            }}
          />
          {record.name}
        </div>
      ),
      dataIndex: `value_${idx}`,
      key: `value_${idx}`,
      align: 'center' as const,
      render: (value: string, row: { key: string; isTag?: boolean; values: string[] }) => {
        const isDifferent = !areValuesEqual(row.values);

        if (row.key === 'lifecycle_enabled') {
          const enabled = value === '已启用';
          return (
            <Tag color={enabled ? 'green' : 'default'}>{value}</Tag>
          );
        }

        return (
          <Text
            style={{
              backgroundColor: isDifferent ? '#fff7e6' : undefined,
              padding: isDifferent ? '2px 8px' : undefined,
              borderRadius: isDifferent ? 4 : undefined,
            }}
          >
            {value}
          </Text>
        );
      },
    })),
  ];

  // 构建表格数据
  const buildDataSource = (params: typeof functionalParams) =>
    params.map((param) => {
      const values = records.map((r) => param.getValue(r));
      return {
        key: param.key,
        label: param.label,
        values,
        ...records.reduce(
          (acc, record, idx) => ({
            ...acc,
            [`value_${idx}`]: param.getValue(record),
          }),
          {}
        ),
      };
    });

  return (
    <Row gutter={24}>
      <Col span={12}>
        <Title level={5} style={{ marginBottom: 12 }}>功能维度</Title>
        <Table
          dataSource={buildDataSource(functionalParams)}
          columns={buildColumns()}
          pagination={false}
          size="small"
          bordered
        />
      </Col>
      <Col span={12}>
        <Title level={5} style={{ marginBottom: 12 }}>技术维度</Title>
        <Table
          dataSource={buildDataSource(technicalParams)}
          columns={buildColumns()}
          pagination={false}
          size="small"
          bordered
        />
      </Col>
    </Row>
  );
};

export default InputParamsComparison;
```

**Step 2: 验证 TypeScript 编译**

Run: `cd frontend && npx tsc --noEmit src/components/comparison/InputParamsComparison.tsx`
Expected: 无错误输出

**Step 3: Commit**

```bash
git add frontend/src/components/comparison/InputParamsComparison.tsx
git commit -m "feat(004): 添加输入参数对比组件"
```

---

## Task 10: 前端 - 定价信息对比组件

**Files:**
- Create: `frontend/src/components/comparison/PricingComparison.tsx`

**Step 1: 创建定价信息对比组件**

```typescript
/**
 * 定价信息对比组件
 */
import React from 'react';
import { Table, Typography } from 'antd';
import type { CalculationRecord } from '../../types/calculationRecords';
import { RECORD_COLORS, areValuesEqual } from '../../utils/comparisonHelpers';
import { formatNumber } from '../../utils/formatters';

const { Text } = Typography;

interface Props {
  records: CalculationRecord[];
}

const PricingComparison: React.FC<Props> = ({ records }) => {
  // 定价参数
  const pricingParams = [
    {
      key: 'region',
      label: 'AWS 区域',
      getValue: (r: CalculationRecord) =>
        `${r.pricing_snapshot.region_name} (${r.pricing_snapshot.region})`,
    },
    {
      key: 'discount',
      label: '折扣',
      getValue: (r: CalculationRecord) => `${r.input_params.pricing.discount_percent}%`,
    },
    {
      key: 'snapshot_date',
      label: '定价日期',
      getValue: (r: CalculationRecord) => r.pricing_snapshot.snapshot_date,
    },
    {
      key: 'storage_price_std',
      label: 'S3 Standard 存储单价',
      getValue: (r: CalculationRecord) => {
        const price = r.pricing_snapshot.storage_pricing.STANDARD?.storage_per_gb;
        return price !== undefined ? `$${formatNumber(price, 6)}/GB` : '-';
      },
    },
    {
      key: 'storage_price_glacier',
      label: 'Glacier IR 存储单价',
      getValue: (r: CalculationRecord) => {
        const price = r.pricing_snapshot.storage_pricing.GLACIER_IR?.storage_per_gb;
        return price !== undefined ? `$${formatNumber(price, 6)}/GB` : '-';
      },
    },
    {
      key: 'put_price_std',
      label: 'S3 Standard PUT 单价',
      getValue: (r: CalculationRecord) => {
        const price = r.pricing_snapshot.storage_pricing.STANDARD?.put_per_1000;
        return price !== undefined ? `$${formatNumber(price, 6)}/千次` : '-';
      },
    },
    {
      key: 'get_price_std',
      label: 'S3 Standard GET 单价',
      getValue: (r: CalculationRecord) => {
        const price = r.pricing_snapshot.storage_pricing.STANDARD?.get_per_1000;
        return price !== undefined ? `$${formatNumber(price, 6)}/千次` : '-';
      },
    },
  ];

  // 构建表格列
  const columns = [
    {
      title: '定价项',
      dataIndex: 'label',
      key: 'label',
      width: 180,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    ...records.map((record, idx) => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: RECORD_COLORS[idx],
              marginRight: 8,
            }}
          />
          {record.name}
        </div>
      ),
      dataIndex: `value_${idx}`,
      key: `value_${idx}`,
      align: 'center' as const,
      render: (value: string, row: { values: string[] }) => {
        const isDifferent = !areValuesEqual(row.values);
        return (
          <Text
            style={{
              backgroundColor: isDifferent ? '#fff7e6' : undefined,
              padding: isDifferent ? '2px 8px' : undefined,
              borderRadius: isDifferent ? 4 : undefined,
            }}
          >
            {value}
          </Text>
        );
      },
    })),
  ];

  // 构建表格数据
  const dataSource = pricingParams.map((param) => {
    const values = records.map((r) => param.getValue(r));
    return {
      key: param.key,
      label: param.label,
      values,
      ...records.reduce(
        (acc, record, idx) => ({
          ...acc,
          [`value_${idx}`]: param.getValue(record),
        }),
        {}
      ),
    };
  });

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      pagination={false}
      size="small"
      bordered
    />
  );
};

export default PricingComparison;
```

**Step 2: 验证 TypeScript 编译**

Run: `cd frontend && npx tsc --noEmit src/components/comparison/PricingComparison.tsx`
Expected: 无错误输出

**Step 3: Commit**

```bash
git add frontend/src/components/comparison/PricingComparison.tsx
git commit -m "feat(004): 添加定价信息对比组件"
```

---

## Task 11: 前端 - 组件导出索引

**Files:**
- Create: `frontend/src/components/comparison/index.ts`

**Step 1: 创建导出索引**

```typescript
/**
 * 对比组件导出
 */
export { default as CostSummaryComparison } from './CostSummaryComparison';
export { default as ComparisonChart } from './ComparisonChart';
export { default as MetricsComparison } from './MetricsComparison';
export { default as StageDetailsComparison } from './StageDetailsComparison';
export { default as InputParamsComparison } from './InputParamsComparison';
export { default as PricingComparison } from './PricingComparison';
```

**Step 2: 验证 TypeScript 编译**

Run: `cd frontend && npx tsc --noEmit src/components/comparison/index.ts`
Expected: 无错误输出

**Step 3: Commit**

```bash
git add frontend/src/components/comparison/index.ts
git commit -m "feat(004): 添加对比组件导出索引"
```

---

## Task 12: 前端 - 对比页面

**Files:**
- Create: `frontend/src/pages/RecordComparison.tsx`

**Step 1: 创建对比页面**

```typescript
/**
 * 核算记录对比页面
 */
import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Button,
  Spin,
  Alert,
  Result,
} from 'antd';
import { SwapOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { calculationRecordApi } from '../api/calculationRecords';
import type { CalculationRecord } from '../types/calculationRecords';
import { AuthContext } from '../contexts/AuthContext';
import {
  CostSummaryComparison,
  ComparisonChart,
  MetricsComparison,
  StageDetailsComparison,
  InputParamsComparison,
  PricingComparison,
} from '../components/comparison';
import { RECORD_COLORS } from '../utils/comparisonHelpers';

const { Title, Text } = Typography;

const RecordComparison: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const isLoggedIn = !!authContext?.user;

  // 解析 URL 参数
  const idsParam = searchParams.get('ids') || '';
  const ids = idsParam.split(',').filter((id) => id.trim());

  // 数据状态
  const [records, setRecords] = useState<CalculationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取记录数据
  useEffect(() => {
    const fetchRecords = async () => {
      if (!isLoggedIn) {
        setLoading(false);
        return;
      }

      if (ids.length < 2 || ids.length > 4) {
        setError('请选择 2-4 条记录进行对比');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await calculationRecordApi.getBatch(ids);
        setRecords(data);
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || '获取记录失败');
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [idsParam, isLoggedIn]);

  // 未登录
  if (!isLoggedIn) {
    return (
      <Card>
        <Result
          status="warning"
          title="请先登录"
          subTitle="您需要登录后才能使用对比功能"
          extra={
            <Button type="primary" onClick={() => navigate('/settings')}>
              去登录
            </Button>
          }
        />
      </Card>
    );
  }

  // 参数错误
  if (ids.length < 2 || ids.length > 4) {
    return (
      <Card>
        <Result
          status="warning"
          title="参数错误"
          subTitle="请选择 2-4 条记录进行对比"
          extra={
            <Button type="primary" onClick={() => navigate('/calculation-records')}>
              返回记录列表
            </Button>
          }
        />
      </Card>
    );
  }

  // 加载中
  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>正在加载对比数据...</Text>
          </div>
        </div>
      </Card>
    );
  }

  // 错误
  if (error) {
    return (
      <Card>
        <Alert
          type="error"
          message="加载失败"
          description={error}
          showIcon
          action={
            <Space>
              <Button onClick={() => window.location.reload()}>重试</Button>
              <Button type="primary" onClick={() => navigate('/calculation-records')}>
                返回列表
              </Button>
            </Space>
          }
        />
      </Card>
    );
  }

  return (
    <div>
      {/* 页面标题 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              <SwapOutlined style={{ marginRight: 8 }} />
              核算记录对比
            </Title>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">对比 {records.length} 条记录的成本明细</Text>
            </div>
          </div>
          <Space>
            {records.map((r, i) => (
              <Tag
                key={r.record_id}
                color={RECORD_COLORS[i]}
                style={{ fontSize: 14, padding: '4px 12px' }}
              >
                {r.name}
              </Tag>
            ))}
          </Space>
        </div>
        <div style={{ marginTop: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/calculation-records')}
          >
            返回记录列表
          </Button>
        </div>
      </Card>

      {/* 1. 费用汇总对比 + 柱状图 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={14}>
          <Card title="💰 费用汇总对比" size="small">
            <CostSummaryComparison records={records} />
          </Card>
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
      <Card title="💵 定价信息对比">
        <PricingComparison records={records} />
      </Card>
    </div>
  );
};

export default RecordComparison;
```

**Step 2: 验证 TypeScript 编译**

Run: `cd frontend && npx tsc --noEmit src/pages/RecordComparison.tsx`
Expected: 无错误输出

**Step 3: Commit**

```bash
git add frontend/src/pages/RecordComparison.tsx
git commit -m "feat(004): 添加核算记录对比页面"
```

---

## Task 13: 前端 - 路由配置

**Files:**
- Modify: `frontend/src/App.tsx:102` (在 calculation-records/:recordId 路由后)

**Step 1: 导入对比页面**

在文件顶部导入部分添加：

```typescript
import RecordComparison from './pages/RecordComparison';
```

**Step 2: 添加对比路由**

在 `calculation-records/:recordId` 路由后添加对比路由：

```typescript
<Route
  path="calculation-records/comparison"
  element={
    <ProtectedRoute minRole="user">
      <RecordComparison />
    </ProtectedRoute>
  }
/>
```

**Step 3: 验证开发服务器启动**

Run: `cd frontend && npm run build 2>&1 | head -20`
Expected: 编译成功

**Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(004): 添加对比页面路由配置"
```

---

## Task 14: 前端 - 列表页添加复选框和对比按钮

**Files:**
- Modify: `frontend/src/pages/CalculationRecords.tsx`

**Step 1: 添加导入**

在文件顶部添加新的导入：

```typescript
import { SwapOutlined } from '@ant-design/icons';
import { Checkbox, Tooltip } from 'antd';
```

**Step 2: 添加选中状态**

在组件内部添加状态：

```typescript
// 对比选中状态
const [selectedIds, setSelectedIds] = useState<string[]>([]);
```

**Step 3: 添加选择处理函数**

在 `handleDelete` 函数后添加：

```typescript
// 选择记录处理
const handleSelect = (recordId: string, checked: boolean) => {
  if (checked) {
    if (selectedIds.length < 4) {
      setSelectedIds([...selectedIds, recordId]);
    }
  } else {
    setSelectedIds(selectedIds.filter((id) => id !== recordId));
  }
};

// 跳转对比页面
const handleCompare = () => {
  if (selectedIds.length >= 2 && selectedIds.length <= 4) {
    navigate(`/calculation-records/comparison?ids=${selectedIds.join(',')}`);
  }
};

// 清除选择
const handleClearSelection = () => {
  setSelectedIds([]);
};
```

**Step 4: 添加复选框列**

在 `columns` 数组最前面添加复选框列：

```typescript
const columns = [
  {
    title: '',
    key: 'selection',
    width: 50,
    render: (_: unknown, record: CalculationRecordSummary) => (
      <Tooltip
        title={
          selectedIds.length >= 4 && !selectedIds.includes(record.record_id)
            ? '最多选择 4 条记录'
            : undefined
        }
      >
        <Checkbox
          checked={selectedIds.includes(record.record_id)}
          onChange={(e) => handleSelect(record.record_id, e.target.checked)}
          disabled={
            selectedIds.length >= 4 && !selectedIds.includes(record.record_id)
          }
        />
      </Tooltip>
    ),
  },
  // ... 原有列
];
```

**Step 5: 添加对比按钮**

在搜索排序区域的 `</Row>` 前添加对比按钮：

```typescript
<Col>
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
      <Button onClick={handleClearSelection}>清除选择</Button>
    )}
  </Space>
</Col>
```

**Step 6: 验证 TypeScript 编译**

Run: `cd frontend && npx tsc --noEmit src/pages/CalculationRecords.tsx`
Expected: 无错误输出

**Step 7: Commit**

```bash
git add frontend/src/pages/CalculationRecords.tsx
git commit -m "feat(004): 列表页添加复选框和对比按钮"
```

---

## Task 15: 集成测试和最终验证

**Step 1: 后端测试**

Run: `cd backend && python -c "from app.api.routes.calculation_records import router; from app.db.repositories.calculation_records import CalculationRecordRepository; print('Backend OK')"`
Expected: Backend OK

**Step 2: 前端构建测试**

Run: `cd frontend && npm run build`
Expected: 编译成功

**Step 3: 最终提交**

```bash
git add -A
git commit -m "feat(004): 完成核算记录对比功能

- 后端: 新增批量获取 API /calculation-records/batch
- 前端: 列表页添加复选框多选和对比按钮
- 前端: 新增独立对比页面 /calculation-records/comparison
- 对比内容: 费用汇总、中间指标、分阶段费用、输入参数、定价信息
- 可视化: 柱状图 + 总成本进度条
- 差异高亮: 最低成本绿色，最高成本红色"
```

---

## 实现清单

| 任务 | 文件 | 说明 |
|------|------|------|
| Task 1 | `backend/app/db/repositories/calculation_records.py` | Repository get_batch 方法 |
| Task 2 | `backend/app/api/routes/calculation_records.py` | API 批量获取端点 |
| Task 3 | `frontend/src/api/calculationRecords.ts` | 前端 API getBatch 方法 |
| Task 4 | `frontend/src/utils/comparisonHelpers.ts` | 对比工具函数 |
| Task 5 | `frontend/src/components/comparison/CostSummaryComparison.tsx` | 费用汇总对比 |
| Task 6 | `frontend/src/components/comparison/ComparisonChart.tsx` | 费用对比柱状图 |
| Task 7 | `frontend/src/components/comparison/MetricsComparison.tsx` | 中间指标对比 |
| Task 8 | `frontend/src/components/comparison/StageDetailsComparison.tsx` | 分阶段费用对比 |
| Task 9 | `frontend/src/components/comparison/InputParamsComparison.tsx` | 输入参数对比 |
| Task 10 | `frontend/src/components/comparison/PricingComparison.tsx` | 定价信息对比 |
| Task 11 | `frontend/src/components/comparison/index.ts` | 组件导出索引 |
| Task 12 | `frontend/src/pages/RecordComparison.tsx` | 对比页面 |
| Task 13 | `frontend/src/App.tsx` | 路由配置 |
| Task 14 | `frontend/src/pages/CalculationRecords.tsx` | 列表页改造 |
| Task 15 | - | 集成测试 |
