# I/O Module - Codemap

**Last Updated:** 2025-01-24
**Location:** `src/io/`
**Purpose:** Excel parsing and report generation

---

## Module Structure

```
src/io/
├── __init__.py           # Module exports
├── excel_reader.py       # Parse input Excel files
├── excel_writer.py       # Generate cost reports
└── formatters.py         # Output formatting utilities
```

---

## Excel Reader

### Input File Format

The reader expects Excel files with the following structure:

```
Row 0: Headers (存储类, 总成本, 设备数, ...)
Row 1: Column descriptions (labels)
Row 2+: Data rows (one per storage class)
```

### Supported Sheets

| Sheet Name | Retention | Storage Classes |
|------------|-----------|-----------------|
| 存储7天 | 7 days | Standard |
| 存储30天 | 30 days | Standard, GIR |
| 存储60天 | 60 days | Standard, GIR |
| 存储90天 | 90 days | Standard, GIR |
| 存储90天（STD3天后转为GIR） | 90 days | Standard → GIR |
| 存储180天 | 180 days | Standard, GIR |
| 存储180天（STD3天后转为GIR） | 180 days | Standard → GIR |
| 存储180天（STD7天后转GIR） | 180 days | Standard → GIR |

### Column Mapping

```python
COLUMN_MAPPING = {
    # Input parameters
    "设备数": "device_count",
    "每秒的数据量(KB)": "data_rate_kb",
    "录像分片秒数": "segment_seconds",
    "录像分片大小(KB)": "segment_size_kb",
    "每个事件秒数": "event_seconds",
    "每个事件分片个数": "segments_per_event",
    "每天事件数": "events_per_day",

    # Cost components
    "每月PUT数": "monthly_puts",
    "PUT单价($/千次)": "put_price_per_1000",
    "每月PUT成本($)": "put_cost",
    "每月GET数量": "monthly_gets",
    "GET单价($/千次)": "get_price_per_1000",
    "每月GET成本($)": "get_cost",
    "GET比例": "get_ratio",
    "平均存储天数": "retention_days",
    "平均每月存储量(GB)": "avg_storage_gb",
    "每月存储成本": "storage_cost",
    "DTO流量": "dto_traffic",
    "DTO单价": "dto_price",
    "DTO费用": "dto_cost",
    "总费用($)": "total_cost",
}
```

---

## Excel Writer

### Output Report Structure

```
Cost_Report.xlsx
├── Summary                    # High-level comparison
├── S3_Standard               # Detailed Standard costs
├── S3_Glacier_IR             # Detailed Glacier costs
├── Lifecycle_Strategy        # Hybrid strategy costs
└── Charts                    # Visual comparisons
```

### Summary Sheet Format

| Metric | S3 Standard | S3 Glacier IR | Lifecycle |
|--------|-------------|---------------|-----------|
| PUT Request Cost | $X.XX | $X.XX | $X.XX |
| GET Request Cost | $X.XX | $X.XX | $X.XX |
| Storage Cost | $X.XX | $X.XX | $X.XX |
| DTO Cost | $X.XX | $X.XX | $X.XX |
| **Total** | **$X.XX** | **$X.XX** | **$X.XX** |
| Savings vs Standard | - | $X.XX | $X.XX |

---

## API

### Reading Excel

```python
from io import ExcelReader

reader = ExcelReader("AWS S3云存成本V4.xlsx")

# Get all sheets
sheets = reader.list_sheets()

# Parse specific retention period
data = reader.parse_retention_sheet("存储30天")

# Extract device parameters
params = reader.extract_params("存储30天")
```

### Writing Reports

```python
from io import ExcelWriter

writer = ExcelWriter()

# Add comparison results
writer.add_comparison(comparison_result)

# Add detailed breakdown
writer.add_breakdown(cost_breakdown, sheet_name="S3_Standard")

# Add chart
writer.add_cost_chart(comparison_result)

# Save
writer.save("Cost_Report.xlsx")
```

---

## Data Validation

```python
def validate_params(params: DeviceParams) -> List[str]:
    """Validate input parameters, return list of errors"""
    errors = []

    if params.device_count <= 0:
        errors.append("device_count must be positive")

    if params.data_rate_kb <= 0:
        errors.append("data_rate_kb must be positive")

    if params.retention_days not in [7, 30, 60, 90, 180]:
        errors.append("retention_days must be 7, 30, 60, 90, or 180")

    if not 0 <= params.get_ratio <= 1:
        errors.append("get_ratio must be between 0 and 1")

    return errors
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| pandas | DataFrame operations |
| openpyxl | Excel read/write |
| xlsxwriter | Chart generation (optional) |

---

## Related Modules

- [Models](./models.md) - Data structures used
- [Calculator](./calculator.md) - Generates results for export
