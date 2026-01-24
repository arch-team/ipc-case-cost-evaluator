# Calculator Module - Codemap

**Last Updated:** 2025-01-24
**Location:** `src/calculator/`
**Purpose:** Core cost calculation engine for AWS S3 storage

---

## Module Structure

```
src/calculator/
├── __init__.py           # Module exports
├── base.py               # Base calculator class
├── standard.py           # S3 Standard cost calculator
├── glacier.py            # S3 Glacier IR cost calculator
├── lifecycle.py          # Lifecycle transition calculator
└── comparator.py         # Multi-strategy comparison
```

---

## Class Diagram

```
                    ┌─────────────────────┐
                    │  BaseCostCalculator │
                    │  (Abstract)         │
                    ├─────────────────────┤
                    │ + calculate_put()   │
                    │ + calculate_get()   │
                    │ + calculate_storage()│
                    │ + calculate_dto()   │
                    │ + total_cost()      │
                    └─────────┬───────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│StandardCalculator│ │GlacierCalculator│ │LifecycleCalculator│
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ PUT: $0.00368   │ │ PUT: $0.02      │ │ std_days: int   │
│ GET: $0.00029   │ │ GET: $0.01      │ │ transition_cost │
│ Storage: $0.0154│ │ Storage: $0.004 │ │ hybrid_calc()   │
└─────────────────┘ │ Retrieval: $0.03│ └─────────────────┘
                    └─────────────────┘
```

---

## Key Formulas

### 1. Monthly PUT Requests
```python
monthly_puts = events_per_day * segments_per_event * 30
```

### 2. Monthly PUT Traffic (GB)
```python
monthly_put_traffic_gb = (events_per_day * event_seconds * data_rate_kb / 1024 / 1024) * 30
```

### 3. Monthly GET Requests
```python
monthly_gets = monthly_puts * get_ratio
```

### 4. Average Storage (GB)
```python
daily_data_gb = events_per_day * event_seconds * data_rate_kb / 1024 / 1024
avg_storage_gb = daily_data_gb * retention_days
```

### 5. Total Monthly Cost
```python
total = put_request_cost + put_traffic_cost + get_request_cost +
        get_retrieval_cost + storage_cost + dto_cost
```

---

## Cost Components

| Component | Standard Formula | Glacier Formula |
|-----------|-----------------|-----------------|
| PUT Request | `puts * 0.00368 / 1000` | `puts * 0.02 / 1000` |
| PUT Traffic | `traffic_gb * 0` (free inbound) | `traffic_gb * 0` |
| GET Request | `gets * 0.00029 / 1000` | `gets * 0.01 / 1000` |
| GET Retrieval | N/A | `get_traffic_gb * 0.03` |
| Storage | `avg_gb * 0.01544` | `avg_gb * 0.004` |
| DTO | `dto_gb * 0.0225` | `dto_gb * 0.0225` |

---

## Usage Example

```python
from calculator import StandardCalculator, GlacierCalculator, compare_strategies

# Define device parameters
params = DeviceParams(
    device_count=1,
    data_rate_kb=136.533,
    segment_seconds=15,
    event_seconds=15,
    events_per_day=400,
    get_ratio=0.1,
    retention_days=30
)

# Calculate costs
std_calc = StandardCalculator(params)
glacier_calc = GlacierCalculator(params)

print(f"S3 Standard: ${std_calc.total_cost():.2f}/month")
print(f"S3 Glacier IR: ${glacier_calc.total_cost():.2f}/month")

# Compare all strategies
comparison = compare_strategies(params, retention_days=30)
comparison.to_excel("cost_comparison.xlsx")
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| dataclasses | Parameter models |
| decimal | Precise cost calculation |
| typing | Type hints |

---

## Related Modules

- [Models](./models.md) - Input parameter definitions
- [I/O](./io.md) - Excel export functionality
