# IPC Case Cost Evaluator - Architecture Overview

**Last Updated:** 2025-01-24
**Project:** IPC (IP Camera) Cloud Storage Cost Evaluation Tool
**Purpose:** Calculate and compare AWS S3 storage costs for video surveillance data

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    IPC Cost Evaluator                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Input      │───▶│   Calculator │───▶│   Output     │      │
│  │   Module     │    │   Engine     │    │   Module     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│        │                    │                    │              │
│        ▼                    ▼                    ▼              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Device Params│    │ Cost Models  │    │ Reports      │      │
│  │ Event Config │    │ - Standard   │    │ - Excel      │      │
│  │ Storage Days │    │ - Glacier    │    │ - Charts     │      │
│  └──────────────┘    │ - Lifecycle  │    │ - Comparison │      │
│                      └──────────────┘    └──────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Index

| Module | Purpose | Location |
|--------|---------|----------|
| [Calculator](./calculator.md) | Core cost calculation engine | `src/calculator/` |
| [Models](./models.md) | Data models and AWS pricing | `src/models/` |
| [Input/Output](./io.md) | Excel parsing and report generation | `src/io/` |

---

## Cost Calculation Flow

```
Input Parameters          Cost Components              Output
─────────────────         ───────────────              ──────

设备数 (devices)    ─┐
                     │    ┌─────────────────┐
每秒数据量 (KB)    ──┼───▶│  PUT Costs      │────┐
                     │    │  • Requests     │    │
录像分片秒数       ──┤    │  • Traffic      │    │
                     │    └─────────────────┘    │
每个事件秒数       ──┤                           │
                     │    ┌─────────────────┐    │
每天事件数         ──┼───▶│  GET Costs      │────┤
                     │    │  • Requests     │    │     ┌──────────────┐
GET比例            ──┤    │  • Retrieval    │    ├────▶│  总费用($)    │
                     │    └─────────────────┘    │     │  Monthly     │
存储天数           ──┤                           │     │  Total Cost  │
                     │    ┌─────────────────┐    │     └──────────────┘
存储类型           ──┼───▶│  Storage Costs  │────┤
                     │    │  • Tiered Price │    │
生命周期策略       ──┘    └─────────────────┘    │
                                                 │
                          ┌─────────────────┐    │
                          │  DTO Costs      │────┘
                          │  • Data Out     │
                          └─────────────────┘
```

---

## Storage Strategies Supported

### 1. Pure S3 Standard
- High performance, immediate access
- Higher storage cost ($0.01544/GB)
- Best for: Frequently accessed data

### 2. Pure S3 Glacier Instant Retrieval (GIR)
- Low storage cost ($0.004/GB)
- Higher retrieval cost ($0.03/GB)
- Best for: Rarely accessed archival data

### 3. Hybrid Lifecycle Strategy
- S3 Standard → (N days) → S3 Glacier IR
- Balances performance and cost
- Best for: Video surveillance with decreasing access over time

---

## Data Sources

### AWS Pricing (ap-northeast-1 region assumed)

| Service | Price |
|---------|-------|
| S3 Standard Storage | $0.01544/GB |
| S3 Glacier IR Storage | $0.004/GB |
| PUT Request (Standard) | $0.00368/1000 |
| PUT Request (Glacier) | $0.02/1000 |
| GET Request (Standard) | $0.00029/1000 |
| GET Request (Glacier) | $0.01/1000 |
| GET Retrieval (Glacier) | $0.03/GB |
| Lifecycle Transition | $0.02/1000 |
| Data Transfer Out | $0.0225/GB |

---

## Technology Stack

- **Language:** Python 3.11+
- **Data Processing:** pandas, openpyxl
- **CLI:** typer or click
- **Visualization:** matplotlib (optional)
- **Testing:** pytest

---

## Quick Links

- [README](../../README.md) - Project setup and usage
- [Calculator Module](./calculator.md) - Cost calculation logic
- [Data Models](./models.md) - Input/output data structures
- [I/O Module](./io.md) - Excel and report handling
