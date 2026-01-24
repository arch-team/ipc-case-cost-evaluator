# Data Models - Codemap

**Last Updated:** 2025-01-24
**Location:** `src/models/`
**Purpose:** Data structures for input parameters and cost results

---

## Module Structure

```
src/models/
├── __init__.py           # Module exports
├── params.py             # Input parameter models
├── pricing.py            # AWS pricing constants
├── results.py            # Cost calculation results
└── enums.py              # Storage class enums
```

---

## Input Parameters Model

```python
@dataclass
class DeviceParams:
    """IPC device and recording configuration"""

    device_count: int           # 设备数
    data_rate_kb: float         # 每秒的数据量(KB) - typically 136.533
    segment_seconds: int        # 录像分片秒数 - typically 15
    segment_size_kb: float      # 录像分片大小(KB) - typically 2048
    event_seconds: int          # 每个事件秒数 - typically 15
    segments_per_event: int     # 每个事件分片个数 - typically 1
    events_per_day: int         # 每天事件数 - typically 400
    get_ratio: float            # GET比例 - typically 0.1 (10%)
    retention_days: int         # 平均存储天数 - 7/30/60/90/180
```

---

## Storage Class Enum

```python
class StorageClass(Enum):
    """AWS S3 Storage Classes"""

    STANDARD = "S3 Standard"
    GLACIER_IR = "S3 Glacier Instant Retrieval"
    STANDARD_TO_GLACIER = "S3 Standard + Lifecycle to GIR"
```

---

## AWS Pricing Model

```python
@dataclass
class AWSPricing:
    """AWS S3 pricing for ap-northeast-1 region"""

    # S3 Standard
    std_put_per_1000: Decimal = Decimal("0.00368")
    std_get_per_1000: Decimal = Decimal("0.00029")
    std_storage_per_gb: Decimal = Decimal("0.01544")

    # S3 Glacier Instant Retrieval
    gir_put_per_1000: Decimal = Decimal("0.02")
    gir_get_per_1000: Decimal = Decimal("0.01")
    gir_storage_per_gb: Decimal = Decimal("0.004")
    gir_retrieval_per_gb: Decimal = Decimal("0.03")

    # Lifecycle Transition
    lifecycle_per_1000: Decimal = Decimal("0.02")

    # Data Transfer Out
    dto_per_gb: Decimal = Decimal("0.0225")

    # PUT Traffic (inbound is free)
    put_traffic_per_gb: Decimal = Decimal("0")
```

---

## Cost Result Model

```python
@dataclass
class CostBreakdown:
    """Detailed cost breakdown for a single strategy"""

    storage_class: StorageClass
    device_count: int
    retention_days: int

    # Request costs
    monthly_puts: int
    put_request_cost: Decimal
    monthly_gets: int
    get_request_cost: Decimal

    # Traffic costs
    put_traffic_gb: Decimal
    put_traffic_cost: Decimal
    get_traffic_gb: Decimal
    get_retrieval_cost: Decimal

    # Storage costs
    avg_storage_gb: Decimal
    storage_cost: Decimal

    # DTO costs
    dto_traffic_gb: Decimal
    dto_cost: Decimal

    # Lifecycle (if applicable)
    lifecycle_transitions: int = 0
    lifecycle_cost: Decimal = Decimal("0")

    @property
    def total_monthly_cost(self) -> Decimal:
        """Total monthly cost per device"""
        return (
            self.put_request_cost +
            self.put_traffic_cost +
            self.get_request_cost +
            self.get_retrieval_cost +
            self.storage_cost +
            self.dto_cost +
            self.lifecycle_cost
        )

    @property
    def total_fleet_cost(self) -> Decimal:
        """Total monthly cost for all devices"""
        return self.total_monthly_cost * self.device_count
```

---

## Comparison Result Model

```python
@dataclass
class ComparisonResult:
    """Multi-strategy comparison result"""

    params: DeviceParams
    results: Dict[StorageClass, CostBreakdown]

    @property
    def cheapest(self) -> StorageClass:
        """Return the cheapest storage strategy"""
        return min(
            self.results.keys(),
            key=lambda k: self.results[k].total_monthly_cost
        )

    @property
    def savings_vs_standard(self) -> Dict[StorageClass, Decimal]:
        """Calculate savings compared to S3 Standard"""
        std_cost = self.results[StorageClass.STANDARD].total_monthly_cost
        return {
            k: std_cost - v.total_monthly_cost
            for k, v in self.results.items()
        }
```

---

## Type Definitions

```python
# Type aliases for clarity
DeviceCount = int
RetentionDays = int
CostUSD = Decimal
TrafficGB = Decimal
RequestCount = int
```

---

## Data Flow

```
DeviceParams                 AWSPricing
     │                            │
     └──────────┬─────────────────┘
                │
                ▼
        ┌───────────────┐
        │  Calculator   │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ CostBreakdown │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ ComparisonResult│
        └───────────────┘
```

---

## Related Modules

- [Calculator](./calculator.md) - Uses these models
- [I/O](./io.md) - Serializes results to Excel
