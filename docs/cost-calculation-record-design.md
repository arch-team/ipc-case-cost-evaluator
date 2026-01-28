# 成本核算记录表设计

## 概述

本文档定义了 IPC 云存储成本评估系统的详细核算记录表结构，用于存储在 AWS DynamoDB 中。

---

## 一、DynamoDB 表设计

### 表名
`ipc_cost_calculation_records`

### 主键设计

| 键类型 | 属性名 | 类型 | 说明 |
|-------|--------|------|------|
| 分区键 (PK) | `user_id` | String | 用户 ID，匿名用户使用 `anonymous` |
| 排序键 (SK) | `record_id` | String | 记录 ID，格式: `CALC#{timestamp}#{uuid}` |

### GSI 索引

| 索引名 | 分区键 | 排序键 | 用途 |
|-------|-------|-------|------|
| `gsi_by_scenario` | `scenario_type` | `created_at` | 按场景类型查询 |
| `gsi_by_storage` | `storage_strategy` | `total_cost` | 按存储策略查询排序 |

---

## 二、完整字段定义

### 2.1 元数据 (metadata)

| 字段名 | 类型 | 必填 | 说明 |
|-------|------|-----|------|
| `record_id` | String | Y | 记录唯一标识 |
| `user_id` | String | Y | 用户 ID |
| `created_at` | String | Y | 创建时间 (ISO8601) |
| `updated_at` | String | Y | 更新时间 (ISO8601) |
| `version` | Number | Y | 记录版本号 |
| `name` | String | N | 记录名称（用户自定义） |
| `description` | String | N | 记录描述 |
| `scenario_type` | String | N | 场景类型标签 |
| `storage_strategy` | String | Y | 存储策略类型 |

### 2.2 输入参数 (input_params)

#### 2.2.1 功能维度 (functional)

| 字段名 | 类型 | 单位 | 说明 | 示例 |
|-------|------|-----|------|------|
| `device_count` | Number | 台 | 设备数量 | 100 |
| `recording_mode` | String | - | 录像模式 | `event_triggered` |
| `video_quality` | String | - | 视频质量 | `1080p` |
| `data_rate_kbps` | Number | KB/s | 每秒数据量 | 312.5 |
| `events_per_day` | Number | 次/天 | 每日事件数 | 400 |
| `event_duration_sec` | Number | 秒 | 事件时长 | 15 |
| `scheduled_hours` | Number | 小时 | 定时录像时长 | 12 |
| `retention_days` | Number | 天 | 总保留天数 | 30 |
| `access_pattern` | Number | 0-1 | 回看比例 | 0.1 |
| `segment_strategy` | String | - | 分片策略 | `fixed_duration` |
| `segment_value` | Number | 秒/KB | 分片值 | 15 |

#### 2.2.2 技术维度 (technical)

| 字段名 | 类型 | 说明 | 示例 |
|-------|------|------|------|
| `storage_class` | String | 主存储类型 | `STANDARD` |
| `lifecycle_enabled` | Boolean | 是否启用生命周期 | true |
| `lifecycle_stages` | List | 生命周期阶段列表 | 见下方 |

**lifecycle_stages 子结构：**
| 字段名 | 类型 | 说明 |
|-------|------|------|
| `stage_index` | Number | 阶段序号 |
| `start_day` | Number | 开始天数 |
| `end_day` | Number | 结束天数 |
| `storage_class` | String | 存储类型 |
| `duration_days` | Number | 持续天数 |

#### 2.2.3 价格维度 (pricing)

| 字段名 | 类型 | 说明 | 示例 |
|-------|------|------|------|
| `region` | String | AWS 区域 | `ap-northeast-1` |
| `discount_percent` | Number | 折扣比例 | 0.1 |
| `pricing_model` | String | 计费模式 | `on_demand` |

---

### 2.3 中间指标 (intermediate_metrics)

#### 2.3.1 数据量指标

| 字段名 | 类型 | 单位 | 计算公式 | 说明 |
|-------|------|-----|---------|------|
| `daily_recording_seconds` | Number | 秒 | `events_per_day × event_duration_sec` | 每日录像总秒数 |
| `daily_data_kb` | Number | KB | `device_count × data_rate_kbps × daily_recording_seconds` | 每日数据量(KB) |
| `daily_data_gb` | Number | GB | `daily_data_kb / 1024 / 1024` | 每日数据量(GB) |
| `monthly_data_gb` | Number | GB | `daily_data_gb × 30` | 月度数据量 |

#### 2.3.2 存储量指标

| 字段名 | 类型 | 单位 | 计算公式 | 说明 |
|-------|------|-----|---------|------|
| `avg_storage_gb` | Number | GB | `daily_data_gb × retention_days` | 平均存储量 |
| `avg_storage_tb` | Number | TB | `avg_storage_gb / 1024` | 平均存储量(TB) |

#### 2.3.3 请求数指标

| 字段名 | 类型 | 单位 | 计算公式 | 说明 |
|-------|------|-----|---------|------|
| `segments_per_event` | Number | 个 | `event_duration_sec / segment_value` | 每事件分片数 |
| `segments_per_day` | Number | 个 | `device_count × events_per_day × segments_per_event` | 每日分片数 |
| `monthly_puts` | Number | 次 | `segments_per_day × 30` | 月度PUT请求数 |
| `monthly_gets` | Number | 次 | `monthly_puts × access_pattern` | 月度GET请求数 |

#### 2.3.4 检索传输指标

| 字段名 | 类型 | 单位 | 计算公式 | 说明 |
|-------|------|-----|---------|------|
| `monthly_retrieval_gb` | Number | GB | `daily_data_gb × 30 × access_pattern` | 月度检索量 |
| `monthly_transfer_gb` | Number | GB | `monthly_retrieval_gb` | 月度传输量 |

---

### 2.4 分阶段费用明细 (stage_cost_details)

对于生命周期策略，每个阶段单独核算：

```json
{
  "stage_cost_details": [
    {
      "stage_index": 1,
      "stage_name": "热存储阶段",
      "storage_class": "STANDARD",
      "start_day": 1,
      "end_day": 7,
      "duration_days": 7,

      "storage": {
        "avg_storage_gb": 13.125,
        "unit_price": 0.025,
        "cost": 0.328
      },

      "put_requests": {
        "count": 12000000,
        "unit_price_per_1000": 0.0047,
        "cost": 56.4
      },

      "get_requests": {
        "access_rate": 0.15,
        "count": 1800000,
        "unit_price_per_1000": 0.00037,
        "cost": 0.666
      },

      "retrieval": {
        "volume_gb": 0,
        "unit_price": 0,
        "cost": 0
      },

      "lifecycle_transition": {
        "count": 0,
        "unit_price_per_1000": 0,
        "cost": 0
      },

      "data_transfer": {
        "volume_gb": 1.96875,
        "unit_price": 0.114,
        "cost": 0.224
      },

      "stage_total_cost": 57.618
    },
    {
      "stage_index": 2,
      "stage_name": "冷存储阶段",
      "storage_class": "GLACIER_IR",
      "start_day": 8,
      "end_day": 30,
      "duration_days": 23,

      "storage": {
        "avg_storage_gb": 43.125,
        "unit_price": 0.004,
        "cost": 0.1725
      },

      "put_requests": {
        "count": 0,
        "unit_price_per_1000": 0,
        "cost": 0
      },

      "get_requests": {
        "access_rate": 0.05,
        "count": 600000,
        "unit_price_per_1000": 0.01,
        "cost": 6.0
      },

      "retrieval": {
        "volume_gb": 0.65625,
        "unit_price": 0.03,
        "cost": 0.0197
      },

      "lifecycle_transition": {
        "count": 12000000,
        "unit_price_per_1000": 0.02,
        "cost": 240
      },

      "data_transfer": {
        "volume_gb": 0.65625,
        "unit_price": 0.114,
        "cost": 0.0748
      },

      "stage_total_cost": 246.267
    }
  ]
}
```

#### 阶段费用字段详细定义

| 分类 | 字段名 | 类型 | 单位 | 说明 |
|-----|-------|------|-----|------|
| **基础信息** | `stage_index` | Number | - | 阶段序号 |
| | `stage_name` | String | - | 阶段名称 |
| | `storage_class` | String | - | 存储类型 |
| | `start_day` | Number | 天 | 开始天数 |
| | `end_day` | Number | 天 | 结束天数 |
| | `duration_days` | Number | 天 | 持续天数 |
| **存储费用** | `storage.avg_storage_gb` | Number | GB | 阶段平均存储量 |
| | `storage.unit_price` | Number | $/GB/月 | 存储单价 |
| | `storage.cost` | Number | $ | 存储费用 |
| **PUT请求** | `put_requests.count` | Number | 次 | PUT请求数 |
| | `put_requests.unit_price_per_1000` | Number | $/千次 | PUT单价 |
| | `put_requests.cost` | Number | $ | PUT费用 |
| **GET请求** | `get_requests.access_rate` | Number | 0-1 | 阶段访问比例 |
| | `get_requests.count` | Number | 次 | GET请求数 |
| | `get_requests.unit_price_per_1000` | Number | $/千次 | GET单价 |
| | `get_requests.cost` | Number | $ | GET费用 |
| **数据检索** | `retrieval.volume_gb` | Number | GB | 检索数据量 |
| | `retrieval.unit_price` | Number | $/GB | 检索单价 |
| | `retrieval.cost` | Number | $ | 检索费用 |
| **生命周期转换** | `lifecycle_transition.count` | Number | 次 | 转换对象数 |
| | `lifecycle_transition.unit_price_per_1000` | Number | $/千次 | 转换单价 |
| | `lifecycle_transition.cost` | Number | $ | 转换费用 |
| **数据传输** | `data_transfer.volume_gb` | Number | GB | 传输数据量 |
| | `data_transfer.unit_price` | Number | $/GB | 传输单价 |
| | `data_transfer.cost` | Number | $ | 传输费用 |
| **阶段合计** | `stage_total_cost` | Number | $ | 阶段总费用 |

---

### 2.5 费用汇总 (cost_summary)

| 字段名 | 类型 | 单位 | 说明 |
|-------|------|-----|------|
| `storage_cost` | Number | $ | 存储费用合计 |
| `put_request_cost` | Number | $ | PUT请求费用合计 |
| `get_request_cost` | Number | $ | GET请求费用合计 |
| `retrieval_cost` | Number | $ | 数据检索费用合计 |
| `lifecycle_cost` | Number | $ | 生命周期转换费用合计 |
| `data_transfer_cost` | Number | $ | 数据传输费用合计 |
| `subtotal` | Number | $ | 费用小计 |
| `discount_amount` | Number | $ | 折扣金额 |
| `total_cost` | Number | $ | 总费用 |
| `cost_per_device` | Number | $ | 单设备成本 |
| `cost_per_gb` | Number | $ | 单位存储成本 |

#### 费用占比分析

| 字段名 | 类型 | 说明 |
|-------|------|------|
| `cost_breakdown_percent.storage` | Number | 存储费用占比 |
| `cost_breakdown_percent.put_requests` | Number | PUT费用占比 |
| `cost_breakdown_percent.get_requests` | Number | GET费用占比 |
| `cost_breakdown_percent.retrieval` | Number | 检索费用占比 |
| `cost_breakdown_percent.lifecycle` | Number | 转换费用占比 |
| `cost_breakdown_percent.data_transfer` | Number | 传输费用占比 |

---

### 2.6 定价快照 (pricing_snapshot)

记录计算时使用的定价数据，用于历史追溯：

```json
{
  "pricing_snapshot": {
    "region": "ap-northeast-1",
    "region_name": "Asia Pacific (Tokyo)",
    "currency": "USD",
    "snapshot_date": "2025-01-28",

    "storage_classes": {
      "STANDARD": {
        "storage_per_gb_month": 0.025,
        "put_per_1000": 0.0047,
        "get_per_1000": 0.00037,
        "retrieval_per_gb": 0,
        "lifecycle_transition_per_1000": 0
      },
      "GLACIER_IR": {
        "storage_per_gb_month": 0.004,
        "put_per_1000": 0.02,
        "get_per_1000": 0.01,
        "retrieval_per_gb": 0.03,
        "lifecycle_transition_per_1000": 0.02
      }
    },

    "data_transfer": {
      "out_first_10tb_per_gb": 0.114,
      "out_next_40tb_per_gb": 0.089,
      "out_next_100tb_per_gb": 0.086,
      "out_over_150tb_per_gb": 0.084
    }
  }
}
```

---

## 三、完整记录示例

### 示例 1: 单一存储类型 (S3 Standard)

```json
{
  "user_id": "user_12345",
  "record_id": "CALC#2025-01-28T10:30:00Z#abc123",

  "metadata": {
    "created_at": "2025-01-28T10:30:00Z",
    "updated_at": "2025-01-28T10:30:00Z",
    "version": 1,
    "name": "中型商超成本评估",
    "scenario_type": "retail",
    "storage_strategy": "single_standard"
  },

  "input_params": {
    "functional": {
      "device_count": 100,
      "recording_mode": "event_triggered",
      "video_quality": "1080p",
      "data_rate_kbps": 312.5,
      "events_per_day": 400,
      "event_duration_sec": 15,
      "retention_days": 30,
      "access_pattern": 0.1,
      "segment_strategy": "fixed_duration",
      "segment_value": 15
    },
    "technical": {
      "storage_class": "STANDARD",
      "lifecycle_enabled": false,
      "lifecycle_stages": []
    },
    "pricing": {
      "region": "ap-northeast-1",
      "discount_percent": 0,
      "pricing_model": "on_demand"
    }
  },

  "intermediate_metrics": {
    "daily_recording_seconds": 6000,
    "daily_data_kb": 187500000,
    "daily_data_gb": 178.81,
    "monthly_data_gb": 5364.3,
    "avg_storage_gb": 5364.3,
    "avg_storage_tb": 5.24,
    "segments_per_event": 1,
    "segments_per_day": 4000000,
    "monthly_puts": 120000000,
    "monthly_gets": 12000000,
    "monthly_retrieval_gb": 536.43,
    "monthly_transfer_gb": 536.43
  },

  "stage_cost_details": [
    {
      "stage_index": 1,
      "stage_name": "全程热存储",
      "storage_class": "STANDARD",
      "start_day": 1,
      "end_day": 30,
      "duration_days": 30,

      "storage": {
        "avg_storage_gb": 5364.3,
        "unit_price": 0.025,
        "cost": 134.11
      },
      "put_requests": {
        "count": 120000000,
        "unit_price_per_1000": 0.0047,
        "cost": 564.0
      },
      "get_requests": {
        "access_rate": 0.1,
        "count": 12000000,
        "unit_price_per_1000": 0.00037,
        "cost": 4.44
      },
      "retrieval": {
        "volume_gb": 0,
        "unit_price": 0,
        "cost": 0
      },
      "lifecycle_transition": {
        "count": 0,
        "unit_price_per_1000": 0,
        "cost": 0
      },
      "data_transfer": {
        "volume_gb": 536.43,
        "unit_price": 0.114,
        "cost": 61.15
      },
      "stage_total_cost": 763.7
    }
  ],

  "cost_summary": {
    "storage_cost": 134.11,
    "put_request_cost": 564.0,
    "get_request_cost": 4.44,
    "retrieval_cost": 0,
    "lifecycle_cost": 0,
    "data_transfer_cost": 61.15,
    "subtotal": 763.7,
    "discount_amount": 0,
    "total_cost": 763.7,
    "cost_per_device": 7.637,
    "cost_per_gb": 0.142,

    "cost_breakdown_percent": {
      "storage": 17.56,
      "put_requests": 73.85,
      "get_requests": 0.58,
      "retrieval": 0,
      "lifecycle": 0,
      "data_transfer": 8.01
    }
  },

  "pricing_snapshot": {
    "region": "ap-northeast-1",
    "snapshot_date": "2025-01-28",
    "storage_classes": {
      "STANDARD": {
        "storage_per_gb_month": 0.025,
        "put_per_1000": 0.0047,
        "get_per_1000": 0.00037,
        "retrieval_per_gb": 0,
        "lifecycle_transition_per_1000": 0
      }
    },
    "data_transfer": {
      "out_first_10tb_per_gb": 0.114
    }
  }
}
```

### 示例 2: 生命周期策略 (Standard → Glacier IR)

```json
{
  "user_id": "user_12345",
  "record_id": "CALC#2025-01-28T10:35:00Z#def456",

  "metadata": {
    "created_at": "2025-01-28T10:35:00Z",
    "updated_at": "2025-01-28T10:35:00Z",
    "version": 1,
    "name": "中型商超成本评估-生命周期优化",
    "scenario_type": "retail",
    "storage_strategy": "lifecycle_standard_to_glacier_ir"
  },

  "input_params": {
    "functional": {
      "device_count": 100,
      "recording_mode": "event_triggered",
      "video_quality": "1080p",
      "data_rate_kbps": 312.5,
      "events_per_day": 400,
      "event_duration_sec": 15,
      "retention_days": 30,
      "access_pattern": 0.1,
      "access_pattern_config": {
        "mode": "time_decay",
        "stages": [
          {"start_day": 1, "end_day": 7, "access_rate": 0.15},
          {"start_day": 8, "end_day": 30, "access_rate": 0.05}
        ]
      },
      "segment_strategy": "fixed_duration",
      "segment_value": 15
    },
    "technical": {
      "storage_class": "STANDARD",
      "lifecycle_enabled": true,
      "lifecycle_stages": [
        {"stage_index": 1, "start_day": 1, "end_day": 7, "storage_class": "STANDARD", "duration_days": 7},
        {"stage_index": 2, "start_day": 8, "end_day": 30, "storage_class": "GLACIER_IR", "duration_days": 23}
      ]
    },
    "pricing": {
      "region": "ap-northeast-1",
      "discount_percent": 0,
      "pricing_model": "on_demand"
    }
  },

  "intermediate_metrics": {
    "daily_recording_seconds": 6000,
    "daily_data_kb": 187500000,
    "daily_data_gb": 178.81,
    "monthly_data_gb": 5364.3,
    "avg_storage_gb": 5364.3,
    "avg_storage_tb": 5.24,
    "segments_per_event": 1,
    "segments_per_day": 4000000,
    "monthly_puts": 120000000,
    "monthly_gets": 12000000,
    "monthly_retrieval_gb": 536.43,
    "monthly_transfer_gb": 536.43
  },

  "stage_cost_details": [
    {
      "stage_index": 1,
      "stage_name": "热存储阶段",
      "storage_class": "STANDARD",
      "start_day": 1,
      "end_day": 7,
      "duration_days": 7,

      "storage": {
        "avg_storage_gb": 1251.67,
        "unit_price": 0.025,
        "cost": 31.29
      },
      "put_requests": {
        "count": 120000000,
        "unit_price_per_1000": 0.0047,
        "cost": 564.0
      },
      "get_requests": {
        "access_rate": 0.15,
        "count": 4200000,
        "unit_price_per_1000": 0.00037,
        "cost": 1.55
      },
      "retrieval": {
        "volume_gb": 0,
        "unit_price": 0,
        "cost": 0
      },
      "lifecycle_transition": {
        "count": 0,
        "unit_price_per_1000": 0,
        "cost": 0
      },
      "data_transfer": {
        "volume_gb": 187.72,
        "unit_price": 0.114,
        "cost": 21.40
      },
      "stage_total_cost": 618.24
    },
    {
      "stage_index": 2,
      "stage_name": "冷存储阶段",
      "storage_class": "GLACIER_IR",
      "start_day": 8,
      "end_day": 30,
      "duration_days": 23,

      "storage": {
        "avg_storage_gb": 4112.63,
        "unit_price": 0.004,
        "cost": 16.45
      },
      "put_requests": {
        "count": 0,
        "unit_price_per_1000": 0,
        "cost": 0
      },
      "get_requests": {
        "access_rate": 0.05,
        "count": 4600000,
        "unit_price_per_1000": 0.01,
        "cost": 46.0
      },
      "retrieval": {
        "volume_gb": 205.71,
        "unit_price": 0.03,
        "cost": 6.17
      },
      "lifecycle_transition": {
        "count": 120000000,
        "unit_price_per_1000": 0.02,
        "cost": 2400.0
      },
      "data_transfer": {
        "volume_gb": 205.71,
        "unit_price": 0.114,
        "cost": 23.45
      },
      "stage_total_cost": 2492.07
    }
  ],

  "cost_summary": {
    "storage_cost": 47.74,
    "put_request_cost": 564.0,
    "get_request_cost": 47.55,
    "retrieval_cost": 6.17,
    "lifecycle_cost": 2400.0,
    "data_transfer_cost": 44.85,
    "subtotal": 3110.31,
    "discount_amount": 0,
    "total_cost": 3110.31,
    "cost_per_device": 31.10,
    "cost_per_gb": 0.58,

    "cost_breakdown_percent": {
      "storage": 1.53,
      "put_requests": 18.14,
      "get_requests": 1.53,
      "retrieval": 0.20,
      "lifecycle": 77.16,
      "data_transfer": 1.44
    }
  },

  "pricing_snapshot": {
    "region": "ap-northeast-1",
    "snapshot_date": "2025-01-28",
    "storage_classes": {
      "STANDARD": {
        "storage_per_gb_month": 0.025,
        "put_per_1000": 0.0047,
        "get_per_1000": 0.00037,
        "retrieval_per_gb": 0,
        "lifecycle_transition_per_1000": 0
      },
      "GLACIER_IR": {
        "storage_per_gb_month": 0.004,
        "put_per_1000": 0.02,
        "get_per_1000": 0.01,
        "retrieval_per_gb": 0.03,
        "lifecycle_transition_per_1000": 0.02
      }
    },
    "data_transfer": {
      "out_first_10tb_per_gb": 0.114
    }
  }
}
```

---

## 四、计算公式汇总

### 4.1 数据量计算

| 指标 | 公式 |
|------|------|
| 每日录像秒数 | `events_per_day × event_duration_sec` (事件触发) |
| 每日数据量(KB) | `device_count × data_rate_kbps × daily_recording_seconds` |
| 每日数据量(GB) | `daily_data_kb / 1024 / 1024` |
| 平均存储量(GB) | `daily_data_gb × retention_days` |

### 4.2 请求数计算

| 指标 | 公式 |
|------|------|
| 每事件分片数 | `ceil(event_duration_sec / segment_value)` |
| 每日分片数 | `device_count × events_per_day × segments_per_event` |
| 月度PUT数 | `segments_per_day × 30` |
| 月度GET数 | `monthly_puts × access_pattern` |

### 4.3 费用计算

| 费用项 | 公式 |
|-------|------|
| 存储费用 | `avg_storage_gb × storage_unit_price × (1 - discount)` |
| PUT费用 | `(monthly_puts / 1000) × put_unit_price × (1 - discount)` |
| GET费用 | `(monthly_gets / 1000) × get_unit_price × (1 - discount)` |
| 检索费用 | `monthly_retrieval_gb × retrieval_unit_price × (1 - discount)` |
| 转换费用 | `(transition_count / 1000) × transition_unit_price × (1 - discount)` |
| 传输费用 | `monthly_transfer_gb × transfer_unit_price × (1 - discount)` |

### 4.4 阶段费用计算 (生命周期策略)

```
阶段存储量 = daily_data_gb × stage_duration_days
阶段PUT数 = monthly_puts (仅第一阶段)
阶段GET数 = monthly_puts × (stage_duration_days / retention_days) × stage_access_rate
阶段检索量 = daily_data_gb × stage_duration_days × stage_access_rate
阶段转换数 = monthly_puts (仅转换阶段)
```

---

## 五、DynamoDB 操作示例

### 创建记录

```python
import boto3
from datetime import datetime
import uuid

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('ipc_cost_calculation_records')

record = {
    'user_id': 'user_12345',
    'record_id': f"CALC#{datetime.utcnow().isoformat()}Z#{uuid.uuid4().hex[:8]}",
    'metadata': {...},
    'input_params': {...},
    'intermediate_metrics': {...},
    'stage_cost_details': [...],
    'cost_summary': {...},
    'pricing_snapshot': {...}
}

table.put_item(Item=record)
```

### 查询用户记录

```python
response = table.query(
    KeyConditionExpression='user_id = :uid',
    ExpressionAttributeValues={':uid': 'user_12345'},
    ScanIndexForward=False,  # 降序排列
    Limit=10
)
```

### 按场景类型查询

```python
response = table.query(
    IndexName='gsi_by_scenario',
    KeyConditionExpression='scenario_type = :st',
    ExpressionAttributeValues={':st': 'retail'}
)
```

---

## 六、版本历史

| 版本 | 日期 | 变更说明 |
|-----|------|---------|
| 1.0 | 2025-01-28 | 初始版本 |
