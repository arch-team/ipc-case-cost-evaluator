# IPC 云存储成本评估系统 - 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个完整的 AWS S3 云存储成本评估系统，包含后端 API、成本计算引擎和 React 前端

**Architecture:** FastAPI 后端提供 REST API，核心计算引擎处理三类维度参数，React 前端提供交互界面，DynamoDB 存储用户评估记录

**Tech Stack:** Python 3.11+ / FastAPI / Pydantic / Pandas / React / TypeScript / Ant Design / AWS DynamoDB

---

## 实现阶段概览

| 阶段 | 内容 | 预计任务数 |
|-----|------|----------|
| Phase 1 | 项目初始化与数据模型 | 8 |
| Phase 2 | 成本计算引擎 | 12 |
| Phase 3 | API 接口层 | 10 |
| Phase 4 | 数据持久化 (DynamoDB) | 8 |
| Phase 5 | Excel 导出 | 6 |
| Phase 6 | React 前端 | 15 |
| Phase 7 | 集成与部署 | 5 |

---

## Phase 1: 项目初始化与数据模型

### Task 1.1: 创建后端项目结构

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/requirements.txt`
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/core/config.py`

**Step 1: 创建目录结构**

```bash
mkdir -p backend/app/{api/routes,core,models,services/calculator,db/repositories,data/aws_pricing,data/scenarios}
mkdir -p backend/tests
```

**Step 2: 创建 requirements.txt**

```txt
# backend/requirements.txt
# Web 框架
fastapi>=0.109.0
uvicorn>=0.27.0
python-multipart>=0.0.6

# 数据处理
pandas>=2.2.0
openpyxl>=3.1.2

# AWS
boto3>=1.34.0

# 认证
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4

# 数据验证
pydantic>=2.5.0
pydantic-settings>=2.1.0

# 测试
pytest>=8.0.0
pytest-asyncio>=0.23.0
httpx>=0.26.0
```

**Step 3: 创建配置文件**

```python
# backend/app/core/config.py
"""应用配置"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """应用配置类"""

    # 应用基础配置
    APP_NAME: str = "IPC Cost Evaluator"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # API 配置
    API_V1_PREFIX: str = "/api/v1"

    # JWT 配置
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 小时

    # AWS 配置
    AWS_REGION: str = "ap-northeast-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None

    # DynamoDB 表名
    DYNAMODB_USERS_TABLE: str = "ipc-cost-users"
    DYNAMODB_EVALUATIONS_TABLE: str = "ipc-cost-evaluations"
    DYNAMODB_SHARES_TABLE: str = "ipc-cost-shares"

    # 本地开发模式 (使用内存存储代替 DynamoDB)
    USE_LOCAL_STORAGE: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
```

**Step 4: 创建 FastAPI 入口**

```python
# backend/app/main.py
"""FastAPI 应用入口"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="IPC 云存储成本评估系统 API",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {"status": "healthy", "version": settings.APP_VERSION}
```

**Step 5: 创建 __init__.py 文件**

```python
# backend/app/__init__.py
"""IPC Cost Evaluator 后端应用"""

# backend/app/core/__init__.py
"""核心配置模块"""

# backend/app/models/__init__.py
"""数据模型模块"""

# backend/app/services/__init__.py
"""业务服务模块"""

# backend/app/services/calculator/__init__.py
"""成本计算引擎"""

# backend/app/api/__init__.py
"""API 模块"""

# backend/app/api/routes/__init__.py
"""API 路由"""

# backend/app/db/__init__.py
"""数据库模块"""

# backend/app/db/repositories/__init__.py
"""数据仓库"""
```

**Step 6: 验证项目启动**

Run: `cd backend && python -m uvicorn app.main:app --reload --port 8000`
Expected: 服务启动成功，访问 http://localhost:8000/health 返回 `{"status": "healthy"}`

**Step 7: 提交**

```bash
git add backend/
git commit -m "feat: 初始化后端项目结构

- 创建 FastAPI 应用入口
- 配置 CORS 和基础设置
- 添加健康检查接口
- 配置 requirements.txt 依赖"
```

---

### Task 1.2: 定义枚举类型

**Files:**
- Create: `backend/app/models/enums.py`
- Create: `backend/tests/test_enums.py`

**Step 1: 编写枚举测试**

```python
# backend/tests/test_enums.py
"""枚举类型测试"""
import pytest
from app.models.enums import (
    RecordingMode,
    VideoQuality,
    SegmentStrategy,
    StorageClass,
    PricingModel,
)


class TestRecordingMode:
    """录像模式枚举测试"""

    def test_recording_mode_values(self):
        """测试录像模式枚举值"""
        assert RecordingMode.CONTINUOUS.value == "continuous"
        assert RecordingMode.EVENT_TRIGGERED.value == "event_triggered"
        assert RecordingMode.SCHEDULED.value == "scheduled"

    def test_recording_mode_chinese_label(self):
        """测试录像模式中文标签"""
        assert RecordingMode.CONTINUOUS.label == "全天候"
        assert RecordingMode.EVENT_TRIGGERED.label == "事件触发"
        assert RecordingMode.SCHEDULED.label == "定时段"


class TestVideoQuality:
    """视频质量枚举测试"""

    def test_video_quality_data_rate(self):
        """测试视频质量对应的数据率"""
        assert VideoQuality.P720.data_rate_kb == 125
        assert VideoQuality.P1080.data_rate_kb == 312.5
        assert VideoQuality.P2K.data_rate_kb == 625
        assert VideoQuality.P4K.data_rate_kb == 1500


class TestStorageClass:
    """存储类型枚举测试"""

    def test_storage_class_values(self):
        """测试存储类型枚举值"""
        assert StorageClass.STANDARD.value == "STANDARD"
        assert StorageClass.GLACIER_IR.value == "GLACIER_IR"
        assert StorageClass.DEEP_ARCHIVE.value == "DEEP_ARCHIVE"
```

**Step 2: 运行测试确认失败**

Run: `cd backend && python -m pytest tests/test_enums.py -v`
Expected: FAIL with "ModuleNotFoundError: No module named 'app.models.enums'"

**Step 3: 实现枚举类型**

```python
# backend/app/models/enums.py
"""枚举类型定义"""
from enum import Enum
from typing import NamedTuple


class RecordingMode(str, Enum):
    """录像模式"""
    CONTINUOUS = "continuous"        # 全天候
    EVENT_TRIGGERED = "event_triggered"  # 事件触发
    SCHEDULED = "scheduled"          # 定时段

    @property
    def label(self) -> str:
        """中文标签"""
        labels = {
            "continuous": "全天候",
            "event_triggered": "事件触发",
            "scheduled": "定时段",
        }
        return labels[self.value]


class VideoQualitySpec(NamedTuple):
    """视频质量规格"""
    resolution: str
    bitrate_kbps: int
    data_rate_kb: float


class VideoQuality(str, Enum):
    """视频质量"""
    P720 = "720p"
    P1080 = "1080p"
    P2K = "2K"
    P4K = "4K"

    @property
    def spec(self) -> VideoQualitySpec:
        """获取视频规格"""
        specs = {
            "720p": VideoQualitySpec("1280x720", 1000, 125),
            "1080p": VideoQualitySpec("1920x1080", 2500, 312.5),
            "2K": VideoQualitySpec("2560x1440", 5000, 625),
            "4K": VideoQualitySpec("3840x2160", 12000, 1500),
        }
        return specs[self.value]

    @property
    def data_rate_kb(self) -> float:
        """每秒数据量 (KB)"""
        return self.spec.data_rate_kb

    @property
    def label(self) -> str:
        """中文标签"""
        return f"{self.value} ({self.spec.resolution})"


class SegmentStrategy(str, Enum):
    """分片传输策略"""
    FIXED_DURATION = "fixed_duration"  # 固定时长
    FIXED_SIZE = "fixed_size"          # 固定大小
    REALTIME_STREAM = "realtime_stream"  # 实时流

    @property
    def label(self) -> str:
        """中文标签"""
        labels = {
            "fixed_duration": "固定时长",
            "fixed_size": "固定大小",
            "realtime_stream": "实时流",
        }
        return labels[self.value]


class StorageClass(str, Enum):
    """S3 存储类型"""
    STANDARD = "STANDARD"
    GLACIER_IR = "GLACIER_IR"  # Glacier Instant Retrieval
    DEEP_ARCHIVE = "DEEP_ARCHIVE"

    @property
    def label(self) -> str:
        """中文标签"""
        labels = {
            "STANDARD": "S3 Standard",
            "GLACIER_IR": "S3 Glacier Instant Retrieval",
            "DEEP_ARCHIVE": "S3 Glacier Deep Archive",
        }
        return labels[self.value]


class PricingModel(str, Enum):
    """计费模式"""
    ON_DEMAND = "on_demand"  # 按需付费
    RESERVED = "reserved"    # 预留容量

    @property
    def label(self) -> str:
        """中文标签"""
        labels = {
            "on_demand": "按需付费",
            "reserved": "预留容量",
        }
        return labels[self.value]


class SharePermission(str, Enum):
    """分享权限"""
    VIEW = "VIEW"        # 仅查看
    DUPLICATE = "DUPLICATE"  # 可复制
```

**Step 4: 运行测试确认通过**

Run: `cd backend && python -m pytest tests/test_enums.py -v`
Expected: PASSED

**Step 5: 提交**

```bash
git add backend/app/models/enums.py backend/tests/test_enums.py
git commit -m "feat: 添加枚举类型定义

- RecordingMode: 录像模式 (全天候/事件触发/定时段)
- VideoQuality: 视频质量 (720p/1080p/2K/4K) 含数据率
- SegmentStrategy: 分片传输策略
- StorageClass: S3 存储类型
- PricingModel: 计费模式"
```

---

### Task 1.3: 定义三类维度数据模型

**Files:**
- Create: `backend/app/models/dimensions.py`
- Create: `backend/tests/test_dimensions.py`

**Step 1: 编写维度模型测试**

```python
# backend/tests/test_dimensions.py
"""维度模型测试"""
import pytest
from pydantic import ValidationError

from app.models.dimensions import (
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
    LifecyclePolicy,
)
from app.models.enums import (
    RecordingMode,
    VideoQuality,
    SegmentStrategy,
    StorageClass,
    PricingModel,
)


class TestFunctionalDimensions:
    """功能维度测试"""

    def test_create_with_defaults(self):
        """测试使用默认值创建"""
        dims = FunctionalDimensions(device_count=100)
        assert dims.device_count == 100
        assert dims.recording_mode == RecordingMode.EVENT_TRIGGERED
        assert dims.video_quality == VideoQuality.P1080
        assert dims.access_pattern == 0.1
        assert dims.retention_days == 30

    def test_device_count_validation(self):
        """测试设备数量验证"""
        with pytest.raises(ValidationError):
            FunctionalDimensions(device_count=0)

        with pytest.raises(ValidationError):
            FunctionalDimensions(device_count=-1)

    def test_access_pattern_range(self):
        """测试访问模式范围"""
        dims = FunctionalDimensions(device_count=100, access_pattern=0.5)
        assert dims.access_pattern == 0.5

        with pytest.raises(ValidationError):
            FunctionalDimensions(device_count=100, access_pattern=1.5)

        with pytest.raises(ValidationError):
            FunctionalDimensions(device_count=100, access_pattern=-0.1)

    def test_event_triggered_requires_events(self):
        """测试事件触发模式需要事件参数"""
        dims = FunctionalDimensions(
            device_count=100,
            recording_mode=RecordingMode.EVENT_TRIGGERED,
            events_per_day=400,
            event_duration_sec=15,
        )
        assert dims.events_per_day == 400
        assert dims.event_duration_sec == 15

    def test_data_rate_kb_property(self):
        """测试数据率属性"""
        dims = FunctionalDimensions(
            device_count=100,
            video_quality=VideoQuality.P1080,
        )
        assert dims.data_rate_kb == 312.5


class TestTechnicalDimensions:
    """技术维度测试"""

    def test_create_with_defaults(self):
        """测试使用默认值创建"""
        dims = TechnicalDimensions()
        assert dims.storage_class == StorageClass.STANDARD
        assert dims.lifecycle_policy is None

    def test_with_lifecycle_policy(self):
        """测试带生命周期策略"""
        policy = LifecyclePolicy(
            enabled=True,
            transition_days=7,
            target_class=StorageClass.GLACIER_IR,
        )
        dims = TechnicalDimensions(
            storage_class=StorageClass.STANDARD,
            lifecycle_policy=policy,
        )
        assert dims.lifecycle_policy.enabled is True
        assert dims.lifecycle_policy.transition_days == 7


class TestPricingDimensions:
    """价格模型维度测试"""

    def test_create_with_defaults(self):
        """测试使用默认值创建"""
        dims = PricingDimensions()
        assert dims.region == "ap-northeast-1"
        assert dims.discount_percent == 0.0
        assert dims.pricing_model == PricingModel.ON_DEMAND

    def test_discount_range(self):
        """测试折扣范围"""
        dims = PricingDimensions(discount_percent=0.3)
        assert dims.discount_percent == 0.3

        with pytest.raises(ValidationError):
            PricingDimensions(discount_percent=0.6)

        with pytest.raises(ValidationError):
            PricingDimensions(discount_percent=-0.1)
```

**Step 2: 运行测试确认失败**

Run: `cd backend && python -m pytest tests/test_dimensions.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: 实现维度模型**

```python
# backend/app/models/dimensions.py
"""三类维度数据模型"""
from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.enums import (
    RecordingMode,
    VideoQuality,
    SegmentStrategy,
    StorageClass,
    PricingModel,
)


class LifecyclePolicy(BaseModel):
    """生命周期策略"""
    enabled: bool = False
    transition_days: int = Field(default=7, ge=1, description="转换天数")
    target_class: StorageClass = StorageClass.GLACIER_IR

    class Config:
        json_schema_extra = {
            "example": {
                "enabled": True,
                "transition_days": 7,
                "target_class": "GLACIER_IR",
            }
        }


class FunctionalDimensions(BaseModel):
    """功能维度 - 业务场景相关参数"""

    # 设备规模
    device_count: int = Field(..., ge=1, description="设备数量")

    # 录像模式
    recording_mode: RecordingMode = Field(
        default=RecordingMode.EVENT_TRIGGERED,
        description="录像模式",
    )

    # 视频质量
    video_quality: VideoQuality = Field(
        default=VideoQuality.P1080,
        description="视频质量",
    )

    # 访问模式
    access_pattern: float = Field(
        default=0.1,
        ge=0.0,
        le=1.0,
        description="回看比例 (0.0-1.0)",
    )

    # 存储周期
    retention_days: int = Field(
        default=30,
        ge=1,
        le=365,
        description="存储保留天数",
    )

    # 事件相关 (事件触发模式使用)
    events_per_day: Optional[int] = Field(
        default=400,
        ge=0,
        description="每日事件数",
    )
    event_duration_sec: Optional[int] = Field(
        default=15,
        ge=1,
        description="事件时长(秒)",
    )

    # 定时段相关 (定时段模式使用)
    scheduled_hours: Optional[float] = Field(
        default=12,
        ge=0,
        le=24,
        description="每日录像小时数",
    )

    # 分片传输
    segment_strategy: SegmentStrategy = Field(
        default=SegmentStrategy.FIXED_DURATION,
        description="分片传输策略",
    )
    segment_value: int = Field(
        default=15,
        ge=1,
        description="分片值 (秒或KB)",
    )

    @property
    def data_rate_kb(self) -> float:
        """获取视频数据率 (KB/s)"""
        return self.video_quality.data_rate_kb

    class Config:
        json_schema_extra = {
            "example": {
                "device_count": 1000,
                "recording_mode": "event_triggered",
                "video_quality": "1080p",
                "access_pattern": 0.1,
                "retention_days": 30,
                "events_per_day": 400,
                "event_duration_sec": 15,
                "segment_strategy": "fixed_duration",
                "segment_value": 15,
            }
        }


class TechnicalDimensions(BaseModel):
    """技术维度 - 方案选型相关参数"""

    storage_class: StorageClass = Field(
        default=StorageClass.STANDARD,
        description="S3 存储类型",
    )

    lifecycle_policy: Optional[LifecyclePolicy] = Field(
        default=None,
        description="生命周期策略",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "storage_class": "STANDARD",
                "lifecycle_policy": {
                    "enabled": False,
                    "transition_days": 7,
                    "target_class": "GLACIER_IR",
                },
            }
        }


class PricingDimensions(BaseModel):
    """价格模型维度 - AWS 定价相关参数"""

    region: str = Field(
        default="ap-northeast-1",
        description="AWS 区域",
    )

    discount_percent: float = Field(
        default=0.0,
        ge=0.0,
        le=0.5,
        description="折扣比例 (0.0-0.5)",
    )

    pricing_model: PricingModel = Field(
        default=PricingModel.ON_DEMAND,
        description="计费模式",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "region": "ap-northeast-1",
                "discount_percent": 0.1,
                "pricing_model": "on_demand",
            }
        }


class CostCalculationInput(BaseModel):
    """成本计算输入 - 包含三类维度"""

    functional: FunctionalDimensions
    technical: TechnicalDimensions = Field(default_factory=TechnicalDimensions)
    pricing: PricingDimensions = Field(default_factory=PricingDimensions)

    class Config:
        json_schema_extra = {
            "example": {
                "functional": {
                    "device_count": 1000,
                    "recording_mode": "event_triggered",
                    "video_quality": "1080p",
                    "access_pattern": 0.1,
                    "retention_days": 30,
                },
                "technical": {
                    "storage_class": "STANDARD",
                },
                "pricing": {
                    "region": "ap-northeast-1",
                    "discount_percent": 0.0,
                },
            }
        }
```

**Step 4: 运行测试确认通过**

Run: `cd backend && python -m pytest tests/test_dimensions.py -v`
Expected: PASSED

**Step 5: 提交**

```bash
git add backend/app/models/dimensions.py backend/tests/test_dimensions.py
git commit -m "feat: 添加三类维度数据模型

- FunctionalDimensions: 功能维度 (设备数/录像模式/视频质量等)
- TechnicalDimensions: 技术维度 (存储类型/生命周期策略)
- PricingDimensions: 价格模型维度 (区域/折扣/计费模式)
- CostCalculationInput: 三类维度组合输入"
```

---

### Task 1.4: 定义 AWS 定价模型

**Files:**
- Create: `backend/app/models/pricing.py`
- Create: `backend/app/data/aws_pricing/ap-northeast-1.json`
- Create: `backend/tests/test_pricing.py`

**Step 1: 编写定价模型测试**

```python
# backend/tests/test_pricing.py
"""AWS 定价模型测试"""
import pytest
from app.models.pricing import S3Pricing, PricingLoader
from app.models.enums import StorageClass


class TestS3Pricing:
    """S3 定价测试"""

    def test_load_ap_northeast_1(self):
        """测试加载东京区域定价"""
        pricing = PricingLoader.load("ap-northeast-1")

        assert pricing.region == "ap-northeast-1"
        assert pricing.currency == "USD"

        # 验证 Standard 定价
        standard = pricing.storage_classes[StorageClass.STANDARD]
        assert standard.storage_per_gb_month > 0
        assert standard.put_per_1000 > 0
        assert standard.get_per_1000 > 0

    def test_get_storage_price(self):
        """测试获取存储价格"""
        pricing = PricingLoader.load("ap-northeast-1")

        price = pricing.get_storage_price(StorageClass.STANDARD)
        assert price == pytest.approx(0.025, rel=0.1)  # 约 $0.025/GB

    def test_get_put_request_price(self):
        """测试获取 PUT 请求价格"""
        pricing = PricingLoader.load("ap-northeast-1")

        price = pricing.get_put_price(StorageClass.STANDARD)
        assert price > 0

    def test_available_regions(self):
        """测试获取可用区域列表"""
        regions = PricingLoader.available_regions()
        assert "ap-northeast-1" in regions


class TestPricingLoader:
    """定价加载器测试"""

    def test_load_invalid_region(self):
        """测试加载无效区域"""
        with pytest.raises(ValueError, match="不支持的区域"):
            PricingLoader.load("invalid-region")
```

**Step 2: 运行测试确认失败**

Run: `cd backend && python -m pytest tests/test_pricing.py -v`
Expected: FAIL

**Step 3: 创建定价数据文件**

```json
// backend/app/data/aws_pricing/ap-northeast-1.json
{
  "region": "ap-northeast-1",
  "region_name": "Asia Pacific (Tokyo)",
  "currency": "USD",
  "last_updated": "2025-01-24",
  "storage_classes": {
    "STANDARD": {
      "storage_per_gb_month": 0.025,
      "put_per_1000": 0.0047,
      "get_per_1000": 0.0004,
      "retrieval_per_gb": 0,
      "lifecycle_transition_per_1000": 0
    },
    "GLACIER_IR": {
      "storage_per_gb_month": 0.005,
      "put_per_1000": 0.02,
      "get_per_1000": 0.01,
      "retrieval_per_gb": 0.03,
      "lifecycle_transition_per_1000": 0.02
    },
    "DEEP_ARCHIVE": {
      "storage_per_gb_month": 0.002,
      "put_per_1000": 0.05,
      "get_per_1000": 0.0004,
      "retrieval_per_gb": 0.02,
      "lifecycle_transition_per_1000": 0.05
    }
  },
  "data_transfer": {
    "out_first_10tb_per_gb": 0.114,
    "out_next_40tb_per_gb": 0.089,
    "out_next_100tb_per_gb": 0.086,
    "out_over_150tb_per_gb": 0.084
  }
}
```

**Step 4: 实现定价模型**

```python
# backend/app/models/pricing.py
"""AWS S3 定价模型"""
import json
from pathlib import Path
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

from app.models.enums import StorageClass


class StorageClassPricing(BaseModel):
    """存储类型定价"""
    storage_per_gb_month: float = Field(..., description="每 GB-月存储费用")
    put_per_1000: float = Field(..., description="每千次 PUT 请求费用")
    get_per_1000: float = Field(..., description="每千次 GET 请求费用")
    retrieval_per_gb: float = Field(default=0, description="每 GB 检索费用")
    lifecycle_transition_per_1000: float = Field(
        default=0,
        description="每千次生命周期转换费用",
    )


class DataTransferPricing(BaseModel):
    """数据传输定价 (阶梯定价)"""
    out_first_10tb_per_gb: float = Field(..., description="前 10TB 每 GB")
    out_next_40tb_per_gb: float = Field(..., description="10-50TB 每 GB")
    out_next_100tb_per_gb: float = Field(..., description="50-150TB 每 GB")
    out_over_150tb_per_gb: float = Field(..., description="超过 150TB 每 GB")

    def get_price_for_gb(self, total_gb: float) -> float:
        """根据总量获取平均单价"""
        if total_gb <= 0:
            return 0

        # 简化计算：使用加权平均
        if total_gb <= 10 * 1024:  # 10TB
            return self.out_first_10tb_per_gb
        elif total_gb <= 50 * 1024:  # 50TB
            return self.out_next_40tb_per_gb
        elif total_gb <= 150 * 1024:  # 150TB
            return self.out_next_100tb_per_gb
        else:
            return self.out_over_150tb_per_gb


class S3Pricing(BaseModel):
    """S3 区域定价"""
    region: str
    region_name: str
    currency: str = "USD"
    last_updated: str
    storage_classes: Dict[StorageClass, StorageClassPricing]
    data_transfer: DataTransferPricing

    def get_storage_price(self, storage_class: StorageClass) -> float:
        """获取存储单价"""
        return self.storage_classes[storage_class].storage_per_gb_month

    def get_put_price(self, storage_class: StorageClass) -> float:
        """获取 PUT 请求单价"""
        return self.storage_classes[storage_class].put_per_1000

    def get_get_price(self, storage_class: StorageClass) -> float:
        """获取 GET 请求单价"""
        return self.storage_classes[storage_class].get_per_1000

    def get_retrieval_price(self, storage_class: StorageClass) -> float:
        """获取检索单价"""
        return self.storage_classes[storage_class].retrieval_per_gb

    def get_lifecycle_price(self, target_class: StorageClass) -> float:
        """获取生命周期转换单价"""
        return self.storage_classes[target_class].lifecycle_transition_per_1000

    def get_data_transfer_price(self, total_gb: float) -> float:
        """获取数据传输单价"""
        return self.data_transfer.get_price_for_gb(total_gb)


class PricingLoader:
    """定价数据加载器"""

    _cache: Dict[str, S3Pricing] = {}
    _pricing_dir: Path = Path(__file__).parent.parent / "data" / "aws_pricing"

    @classmethod
    def load(cls, region: str) -> S3Pricing:
        """加载指定区域的定价数据"""
        if region in cls._cache:
            return cls._cache[region]

        pricing_file = cls._pricing_dir / f"{region}.json"
        if not pricing_file.exists():
            available = cls.available_regions()
            raise ValueError(
                f"不支持的区域: {region}。可用区域: {', '.join(available)}"
            )

        with open(pricing_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        # 转换存储类型键为枚举
        storage_classes = {}
        for key, value in data["storage_classes"].items():
            storage_class = StorageClass(key)
            storage_classes[storage_class] = StorageClassPricing(**value)

        data["storage_classes"] = storage_classes
        data["data_transfer"] = DataTransferPricing(**data["data_transfer"])

        pricing = S3Pricing(**data)
        cls._cache[region] = pricing
        return pricing

    @classmethod
    def available_regions(cls) -> List[str]:
        """获取可用区域列表"""
        if not cls._pricing_dir.exists():
            return []
        return [
            f.stem for f in cls._pricing_dir.glob("*.json")
        ]

    @classmethod
    def clear_cache(cls):
        """清除缓存"""
        cls._cache.clear()
```

**Step 5: 运行测试确认通过**

Run: `cd backend && python -m pytest tests/test_pricing.py -v`
Expected: PASSED

**Step 6: 提交**

```bash
git add backend/app/models/pricing.py backend/app/data/aws_pricing/ backend/tests/test_pricing.py
git commit -m "feat: 添加 AWS S3 定价模型

- S3Pricing: 区域定价模型
- StorageClassPricing: 存储类型定价
- DataTransferPricing: 数据传输阶梯定价
- PricingLoader: 定价数据加载器 (带缓存)
- 添加 ap-northeast-1 区域定价数据"
```

---

### Task 1.5: 定义计算结果模型

**Files:**
- Create: `backend/app/models/results.py`
- Create: `backend/tests/test_results.py`

**Step 1: 编写结果模型测试**

```python
# backend/tests/test_results.py
"""计算结果模型测试"""
import pytest
from app.models.results import (
    CostBreakdown,
    CostSummary,
    ComparisonItem,
    ComparisonResult,
    Recommendation,
)


class TestCostBreakdown:
    """费用明细测试"""

    def test_total_calculation(self):
        """测试总费用计算"""
        breakdown = CostBreakdown(
            storage_cost=100.0,
            put_request_cost=20.0,
            get_request_cost=5.0,
            retrieval_cost=10.0,
            data_transfer_cost=15.0,
            lifecycle_cost=0.0,
        )
        assert breakdown.total == 150.0

    def test_percentage_calculation(self):
        """测试占比计算"""
        breakdown = CostBreakdown(
            storage_cost=80.0,
            put_request_cost=20.0,
            get_request_cost=0.0,
            retrieval_cost=0.0,
            data_transfer_cost=0.0,
            lifecycle_cost=0.0,
        )
        percentages = breakdown.percentages
        assert percentages["storage_cost"] == pytest.approx(0.8, rel=0.01)
        assert percentages["put_request_cost"] == pytest.approx(0.2, rel=0.01)


class TestCostSummary:
    """成本汇总测试"""

    def test_create_summary(self):
        """测试创建汇总"""
        breakdown = CostBreakdown(
            storage_cost=100.0,
            put_request_cost=20.0,
            get_request_cost=5.0,
            retrieval_cost=0.0,
            data_transfer_cost=15.0,
            lifecycle_cost=0.0,
        )
        summary = CostSummary(
            monthly_total=140.0,
            per_device_monthly=0.14,
            breakdown=breakdown,
            device_count=1000,
        )
        assert summary.yearly_total == pytest.approx(1680.0, rel=0.01)


class TestComparisonResult:
    """对比结果测试"""

    def test_find_best_option(self):
        """测试找到最优方案"""
        items = [
            ComparisonItem(
                name="S3 Standard",
                storage_class="STANDARD",
                monthly_cost=100.0,
                yearly_cost=1200.0,
                vs_baseline=0.0,
            ),
            ComparisonItem(
                name="Glacier IR",
                storage_class="GLACIER_IR",
                monthly_cost=80.0,
                yearly_cost=960.0,
                vs_baseline=-0.2,
            ),
        ]
        result = ComparisonResult(
            baseline="S3 Standard",
            items=items,
        )
        assert result.best_option.name == "Glacier IR"
```

**Step 2: 运行测试确认失败**

Run: `cd backend && python -m pytest tests/test_results.py -v`
Expected: FAIL

**Step 3: 实现结果模型**

```python
# backend/app/models/results.py
"""计算结果数据模型"""
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, computed_field


class CostBreakdown(BaseModel):
    """费用明细"""
    storage_cost: float = Field(..., description="存储费用")
    put_request_cost: float = Field(..., description="PUT 请求费用")
    get_request_cost: float = Field(..., description="GET 请求费用")
    retrieval_cost: float = Field(default=0, description="检索费用")
    data_transfer_cost: float = Field(default=0, description="数据传输费用")
    lifecycle_cost: float = Field(default=0, description="生命周期转换费用")

    @computed_field
    @property
    def total(self) -> float:
        """总费用"""
        return (
            self.storage_cost
            + self.put_request_cost
            + self.get_request_cost
            + self.retrieval_cost
            + self.data_transfer_cost
            + self.lifecycle_cost
        )

    @property
    def percentages(self) -> Dict[str, float]:
        """各项费用占比"""
        if self.total == 0:
            return {
                "storage_cost": 0,
                "put_request_cost": 0,
                "get_request_cost": 0,
                "retrieval_cost": 0,
                "data_transfer_cost": 0,
                "lifecycle_cost": 0,
            }
        return {
            "storage_cost": self.storage_cost / self.total,
            "put_request_cost": self.put_request_cost / self.total,
            "get_request_cost": self.get_request_cost / self.total,
            "retrieval_cost": self.retrieval_cost / self.total,
            "data_transfer_cost": self.data_transfer_cost / self.total,
            "lifecycle_cost": self.lifecycle_cost / self.total,
        }

    def to_display_dict(self) -> Dict[str, Dict]:
        """转换为显示格式"""
        percentages = self.percentages
        return {
            "存储费用": {"amount": self.storage_cost, "percent": percentages["storage_cost"]},
            "PUT请求费用": {"amount": self.put_request_cost, "percent": percentages["put_request_cost"]},
            "GET请求费用": {"amount": self.get_request_cost, "percent": percentages["get_request_cost"]},
            "检索费用": {"amount": self.retrieval_cost, "percent": percentages["retrieval_cost"]},
            "数据传输费用": {"amount": self.data_transfer_cost, "percent": percentages["data_transfer_cost"]},
            "生命周期转换费用": {"amount": self.lifecycle_cost, "percent": percentages["lifecycle_cost"]},
        }


class IntermediateMetrics(BaseModel):
    """中间计算指标"""
    daily_data_gb: float = Field(..., description="每日数据量 (GB)")
    avg_storage_gb: float = Field(..., description="平均存储量 (GB)")
    monthly_puts: float = Field(..., description="月度 PUT 请求数")
    monthly_gets: float = Field(..., description="月度 GET 请求数")
    monthly_retrieval_gb: float = Field(default=0, description="月度检索数据量 (GB)")
    monthly_transfer_gb: float = Field(default=0, description="月度传输数据量 (GB)")


class CostSummary(BaseModel):
    """成本计算汇总"""
    monthly_total: float = Field(..., description="月度总费用")
    per_device_monthly: float = Field(..., description="每设备月费用")
    breakdown: CostBreakdown = Field(..., description="费用明细")
    device_count: int = Field(..., description="设备数量")
    metrics: Optional[IntermediateMetrics] = Field(default=None, description="中间计算指标")

    @computed_field
    @property
    def yearly_total(self) -> float:
        """年度总费用"""
        return self.monthly_total * 12

    @computed_field
    @property
    def per_device_yearly(self) -> float:
        """每设备年费用"""
        return self.per_device_monthly * 12


class ComparisonItem(BaseModel):
    """方案对比项"""
    name: str = Field(..., description="方案名称")
    storage_class: str = Field(..., description="存储类型")
    monthly_cost: float = Field(..., description="月度费用")
    yearly_cost: float = Field(..., description="年度费用")
    vs_baseline: float = Field(..., description="相对基准的差异比例")
    breakdown: Optional[CostBreakdown] = Field(default=None, description="费用明细")
    is_recommended: bool = Field(default=False, description="是否推荐")

    @property
    def vs_baseline_percent(self) -> str:
        """差异百分比字符串"""
        if self.vs_baseline == 0:
            return "基准"
        sign = "+" if self.vs_baseline > 0 else ""
        return f"{sign}{self.vs_baseline:.1%}"


class Recommendation(BaseModel):
    """优化推荐"""
    recommended_option: str = Field(..., description="推荐方案")
    reason: str = Field(..., description="推荐原因")
    potential_savings: Optional[float] = Field(default=None, description="潜在节省金额")
    suggestions: List[str] = Field(default_factory=list, description="优化建议列表")


class ComparisonResult(BaseModel):
    """方案对比结果"""
    baseline: str = Field(..., description="基准方案名称")
    items: List[ComparisonItem] = Field(..., description="对比项列表")
    recommendation: Optional[Recommendation] = Field(default=None, description="优化推荐")

    @property
    def best_option(self) -> ComparisonItem:
        """最优方案 (最低成本)"""
        return min(self.items, key=lambda x: x.monthly_cost)

    def get_by_name(self, name: str) -> Optional[ComparisonItem]:
        """根据名称获取对比项"""
        for item in self.items:
            if item.name == name:
                return item
        return None


class SensitivityItem(BaseModel):
    """敏感度分析项"""
    parameter: str = Field(..., description="参数名称")
    change_description: str = Field(..., description="变化描述")
    original_cost: float = Field(..., description="原始费用")
    new_cost: float = Field(..., description="新费用")
    cost_change: float = Field(..., description="费用变化金额")
    cost_change_percent: float = Field(..., description="费用变化百分比")


class SensitivityAnalysis(BaseModel):
    """敏感度分析结果"""
    base_monthly_cost: float = Field(..., description="基准月度费用")
    items: List[SensitivityItem] = Field(..., description="分析项列表")
```

**Step 4: 运行测试确认通过**

Run: `cd backend && python -m pytest tests/test_results.py -v`
Expected: PASSED

**Step 5: 提交**

```bash
git add backend/app/models/results.py backend/tests/test_results.py
git commit -m "feat: 添加计算结果数据模型

- CostBreakdown: 费用明细 (含占比计算)
- CostSummary: 成本汇总 (月度/年度/每设备)
- ComparisonItem: 方案对比项
- ComparisonResult: 对比结果 (含最优方案)
- Recommendation: 优化推荐
- SensitivityAnalysis: 敏感度分析"
```

---

## Phase 2: 成本计算引擎

### Task 2.1: 实现基础计算器

**Files:**
- Create: `backend/app/services/calculator/base.py`
- Create: `backend/tests/test_calculator_base.py`

**Step 1: 编写基础计算器测试**

```python
# backend/tests/test_calculator_base.py
"""基础计算器测试"""
import pytest
from app.services.calculator.base import BaseCalculator
from app.models.dimensions import (
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
)
from app.models.enums import RecordingMode, VideoQuality, SegmentStrategy


class TestBaseCalculator:
    """基础计算器测试"""

    @pytest.fixture
    def event_triggered_dims(self):
        """事件触发场景维度"""
        return FunctionalDimensions(
            device_count=1000,
            recording_mode=RecordingMode.EVENT_TRIGGERED,
            video_quality=VideoQuality.P1080,
            events_per_day=400,
            event_duration_sec=15,
            retention_days=30,
            access_pattern=0.1,
            segment_strategy=SegmentStrategy.FIXED_DURATION,
            segment_value=15,
        )

    def test_calculate_daily_data_event_triggered(self, event_triggered_dims):
        """测试事件触发模式每日数据量计算"""
        # 1000设备 × 312.5KB/s × 400事件 × 15秒 / 1024 / 1024
        # = 1000 × 312.5 × 400 × 15 / 1048576
        # ≈ 1788 GB
        daily_data = BaseCalculator.calculate_daily_data_gb(event_triggered_dims)
        assert daily_data == pytest.approx(1788, rel=0.05)

    def test_calculate_daily_data_continuous(self):
        """测试全天候模式每日数据量计算"""
        dims = FunctionalDimensions(
            device_count=100,
            recording_mode=RecordingMode.CONTINUOUS,
            video_quality=VideoQuality.P1080,
            retention_days=30,
        )
        # 100设备 × 312.5KB/s × 86400秒 / 1024 / 1024
        # = 100 × 312.5 × 86400 / 1048576
        # ≈ 2575 GB
        daily_data = BaseCalculator.calculate_daily_data_gb(dims)
        assert daily_data == pytest.approx(2575, rel=0.05)

    def test_calculate_monthly_puts(self, event_triggered_dims):
        """测试月度 PUT 请求数计算"""
        daily_data = BaseCalculator.calculate_daily_data_gb(event_triggered_dims)
        monthly_puts = BaseCalculator.calculate_monthly_puts(
            event_triggered_dims,
            daily_data,
        )
        # 固定时长分片: 每个事件 15秒 / 15秒分片 = 1个请求
        # 1000设备 × 400事件 × 1请求 × 30天 = 12,000,000
        assert monthly_puts == pytest.approx(12_000_000, rel=0.05)

    def test_calculate_monthly_gets(self, event_triggered_dims):
        """测试月度 GET 请求数计算"""
        monthly_puts = 12_000_000
        monthly_gets = BaseCalculator.calculate_monthly_gets(
            event_triggered_dims,
            monthly_puts,
        )
        # 12,000,000 × 0.1 = 1,200,000
        assert monthly_gets == pytest.approx(1_200_000, rel=0.05)
```

**Step 2: 运行测试确认失败**

Run: `cd backend && python -m pytest tests/test_calculator_base.py -v`
Expected: FAIL

**Step 3: 实现基础计算器**

```python
# backend/app/services/calculator/base.py
"""基础计算器 - 通用计算逻辑"""
from app.models.dimensions import FunctionalDimensions
from app.models.enums import RecordingMode, SegmentStrategy


class BaseCalculator:
    """基础计算器类 - 提供通用计算方法"""

    @staticmethod
    def calculate_daily_data_gb(functional: FunctionalDimensions) -> float:
        """
        计算每日数据量 (GB)

        Args:
            functional: 功能维度参数

        Returns:
            每日数据量 (GB)
        """
        data_rate_kb = functional.data_rate_kb
        device_count = functional.device_count

        if functional.recording_mode == RecordingMode.CONTINUOUS:
            # 全天候: 设备数 × 数据率 × 86400秒
            daily_seconds = 86400
            daily_data_kb = device_count * data_rate_kb * daily_seconds

        elif functional.recording_mode == RecordingMode.EVENT_TRIGGERED:
            # 事件触发: 设备数 × 数据率 × 事件数 × 事件时长
            events = functional.events_per_day or 0
            duration = functional.event_duration_sec or 0
            daily_data_kb = device_count * data_rate_kb * events * duration

        elif functional.recording_mode == RecordingMode.SCHEDULED:
            # 定时段: 设备数 × 数据率 × 每日小时数 × 3600
            hours = functional.scheduled_hours or 0
            daily_data_kb = device_count * data_rate_kb * hours * 3600

        else:
            daily_data_kb = 0

        # 转换为 GB
        return daily_data_kb / 1024 / 1024

    @staticmethod
    def calculate_avg_storage_gb(
        daily_data_gb: float,
        retention_days: int,
    ) -> float:
        """
        计算平均存储量 (GB)

        稳态下，存储量 = 每日数据量 × 保留天数
        """
        return daily_data_gb * retention_days

    @staticmethod
    def calculate_daily_recording_seconds(functional: FunctionalDimensions) -> float:
        """
        计算每日录像总秒数 (单设备)
        """
        if functional.recording_mode == RecordingMode.CONTINUOUS:
            return 86400
        elif functional.recording_mode == RecordingMode.EVENT_TRIGGERED:
            events = functional.events_per_day or 0
            duration = functional.event_duration_sec or 0
            return events * duration
        elif functional.recording_mode == RecordingMode.SCHEDULED:
            hours = functional.scheduled_hours or 0
            return hours * 3600
        return 0

    @staticmethod
    def calculate_segments_per_day(
        functional: FunctionalDimensions,
        daily_data_gb: float,
    ) -> float:
        """
        计算每日分片数 (单设备)
        """
        daily_seconds = BaseCalculator.calculate_daily_recording_seconds(functional)

        if functional.segment_strategy == SegmentStrategy.FIXED_DURATION:
            # 固定时长: 每日秒数 / 分片秒数
            segment_seconds = functional.segment_value
            return daily_seconds / segment_seconds if segment_seconds > 0 else 0

        elif functional.segment_strategy == SegmentStrategy.FIXED_SIZE:
            # 固定大小: 每日数据量 / 分片大小
            # daily_data_gb 是所有设备的，需要除以设备数
            segment_size_kb = functional.segment_value
            daily_data_kb_per_device = (daily_data_gb / functional.device_count) * 1024 * 1024
            return daily_data_kb_per_device / segment_size_kb if segment_size_kb > 0 else 0

        elif functional.segment_strategy == SegmentStrategy.REALTIME_STREAM:
            # 实时流: 每秒一个请求
            return daily_seconds

        return 0

    @staticmethod
    def calculate_monthly_puts(
        functional: FunctionalDimensions,
        daily_data_gb: float,
    ) -> float:
        """
        计算月度 PUT 请求数
        """
        segments_per_day = BaseCalculator.calculate_segments_per_day(
            functional,
            daily_data_gb,
        )
        return functional.device_count * segments_per_day * 30

    @staticmethod
    def calculate_monthly_gets(
        functional: FunctionalDimensions,
        monthly_puts: float,
    ) -> float:
        """
        计算月度 GET 请求数

        假设: GET 请求数 = PUT 请求数 × 访问比例
        """
        return monthly_puts * functional.access_pattern

    @staticmethod
    def calculate_monthly_retrieval_gb(
        daily_data_gb: float,
        access_pattern: float,
    ) -> float:
        """
        计算月度检索数据量 (GB)

        用于 Glacier 类型的检索费用计算
        """
        return daily_data_gb * 30 * access_pattern

    @staticmethod
    def calculate_monthly_transfer_gb(
        monthly_retrieval_gb: float,
    ) -> float:
        """
        计算月度数据传输量 (GB)

        假设: 传输量 = 检索量 (所有检索的数据都会传输出去)
        """
        return monthly_retrieval_gb
```

**Step 4: 运行测试确认通过**

Run: `cd backend && python -m pytest tests/test_calculator_base.py -v`
Expected: PASSED

**Step 5: 提交**

```bash
git add backend/app/services/calculator/base.py backend/tests/test_calculator_base.py
git commit -m "feat: 实现基础计算器

- calculate_daily_data_gb: 计算每日数据量
- calculate_avg_storage_gb: 计算平均存储量
- calculate_monthly_puts: 计算月度 PUT 请求数
- calculate_monthly_gets: 计算月度 GET 请求数
- 支持三种录像模式和三种分片策略"
```

---

### Task 2.2: 实现 S3 Standard 计算器

**Files:**
- Create: `backend/app/services/calculator/s3_standard.py`
- Create: `backend/tests/test_s3_standard.py`

**Step 1: 编写 S3 Standard 计算器测试**

```python
# backend/tests/test_s3_standard.py
"""S3 Standard 计算器测试"""
import pytest
from app.services.calculator.s3_standard import S3StandardCalculator
from app.models.dimensions import (
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
    CostCalculationInput,
)
from app.models.enums import RecordingMode, VideoQuality, StorageClass


class TestS3StandardCalculator:
    """S3 Standard 计算器测试"""

    @pytest.fixture
    def sample_input(self):
        """示例输入"""
        return CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
            ),
            pricing=PricingDimensions(
                region="ap-northeast-1",
                discount_percent=0.0,
            ),
        )

    def test_calculate_returns_cost_summary(self, sample_input):
        """测试计算返回成本汇总"""
        calculator = S3StandardCalculator()
        result = calculator.calculate(sample_input)

        assert result.monthly_total > 0
        assert result.per_device_monthly > 0
        assert result.device_count == 1000
        assert result.breakdown.storage_cost > 0
        assert result.breakdown.put_request_cost > 0

    def test_calculate_with_discount(self, sample_input):
        """测试带折扣的计算"""
        sample_input.pricing.discount_percent = 0.1

        calculator = S3StandardCalculator()
        result_with_discount = calculator.calculate(sample_input)

        sample_input.pricing.discount_percent = 0.0
        result_no_discount = calculator.calculate(sample_input)

        # 有折扣的费用应该更低
        assert result_with_discount.monthly_total < result_no_discount.monthly_total
        # 折扣约 10%
        ratio = result_with_discount.monthly_total / result_no_discount.monthly_total
        assert ratio == pytest.approx(0.9, rel=0.01)

    def test_storage_is_dominant_cost(self, sample_input):
        """测试存储费用是主要成本"""
        calculator = S3StandardCalculator()
        result = calculator.calculate(sample_input)

        percentages = result.breakdown.percentages
        # Standard 存储通常是主要成本
        assert percentages["storage_cost"] > 0.5
```

**Step 2: 运行测试确认失败**

Run: `cd backend && python -m pytest tests/test_s3_standard.py -v`
Expected: FAIL

**Step 3: 实现 S3 Standard 计算器**

```python
# backend/app/services/calculator/s3_standard.py
"""S3 Standard 存储成本计算器"""
from app.models.dimensions import CostCalculationInput
from app.models.results import CostBreakdown, CostSummary, IntermediateMetrics
from app.models.pricing import PricingLoader
from app.models.enums import StorageClass
from app.services.calculator.base import BaseCalculator


class S3StandardCalculator:
    """S3 Standard 存储类型计算器"""

    def calculate(self, input_data: CostCalculationInput) -> CostSummary:
        """
        计算 S3 Standard 存储成本

        Args:
            input_data: 三类维度输入

        Returns:
            成本计算汇总
        """
        functional = input_data.functional
        pricing_dims = input_data.pricing

        # 加载定价数据
        pricing = PricingLoader.load(pricing_dims.region)
        storage_class = StorageClass.STANDARD
        discount = pricing_dims.discount_percent

        # 计算中间指标
        daily_data_gb = BaseCalculator.calculate_daily_data_gb(functional)
        avg_storage_gb = BaseCalculator.calculate_avg_storage_gb(
            daily_data_gb,
            functional.retention_days,
        )
        monthly_puts = BaseCalculator.calculate_monthly_puts(functional, daily_data_gb)
        monthly_gets = BaseCalculator.calculate_monthly_gets(functional, monthly_puts)
        monthly_retrieval_gb = BaseCalculator.calculate_monthly_retrieval_gb(
            daily_data_gb,
            functional.access_pattern,
        )
        monthly_transfer_gb = BaseCalculator.calculate_monthly_transfer_gb(
            monthly_retrieval_gb,
        )

        # 计算各项费用
        storage_cost = (
            avg_storage_gb
            * pricing.get_storage_price(storage_class)
            * (1 - discount)
        )

        put_cost = (
            (monthly_puts / 1000)
            * pricing.get_put_price(storage_class)
            * (1 - discount)
        )

        get_cost = (
            (monthly_gets / 1000)
            * pricing.get_get_price(storage_class)
            * (1 - discount)
        )

        # Standard 没有检索费用
        retrieval_cost = 0.0

        # 数据传输费用
        transfer_cost = (
            monthly_transfer_gb
            * pricing.get_data_transfer_price(monthly_transfer_gb)
            * (1 - discount)
        )

        # Standard 不需要生命周期转换
        lifecycle_cost = 0.0

        # 构建结果
        breakdown = CostBreakdown(
            storage_cost=storage_cost,
            put_request_cost=put_cost,
            get_request_cost=get_cost,
            retrieval_cost=retrieval_cost,
            data_transfer_cost=transfer_cost,
            lifecycle_cost=lifecycle_cost,
        )

        metrics = IntermediateMetrics(
            daily_data_gb=daily_data_gb,
            avg_storage_gb=avg_storage_gb,
            monthly_puts=monthly_puts,
            monthly_gets=monthly_gets,
            monthly_retrieval_gb=monthly_retrieval_gb,
            monthly_transfer_gb=monthly_transfer_gb,
        )

        monthly_total = breakdown.total
        per_device_monthly = monthly_total / functional.device_count

        return CostSummary(
            monthly_total=monthly_total,
            per_device_monthly=per_device_monthly,
            breakdown=breakdown,
            device_count=functional.device_count,
            metrics=metrics,
        )
```

**Step 4: 运行测试确认通过**

Run: `cd backend && python -m pytest tests/test_s3_standard.py -v`
Expected: PASSED

**Step 5: 提交**

```bash
git add backend/app/services/calculator/s3_standard.py backend/tests/test_s3_standard.py
git commit -m "feat: 实现 S3 Standard 成本计算器

- 计算存储、PUT/GET 请求、数据传输费用
- 支持折扣计算
- 返回详细的费用明细和中间指标"
```

---

### Task 2.3: 实现 S3 Glacier IR 计算器

**Files:**
- Create: `backend/app/services/calculator/s3_glacier.py`
- Create: `backend/tests/test_s3_glacier.py`

**Step 1: 编写 S3 Glacier 计算器测试**

```python
# backend/tests/test_s3_glacier.py
"""S3 Glacier IR 计算器测试"""
import pytest
from app.services.calculator.s3_glacier import S3GlacierCalculator
from app.models.dimensions import (
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
    CostCalculationInput,
)
from app.models.enums import RecordingMode, VideoQuality, StorageClass


class TestS3GlacierCalculator:
    """S3 Glacier IR 计算器测试"""

    @pytest.fixture
    def sample_input(self):
        """示例输入"""
        return CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.GLACIER_IR,
            ),
            pricing=PricingDimensions(
                region="ap-northeast-1",
                discount_percent=0.0,
            ),
        )

    def test_calculate_returns_cost_summary(self, sample_input):
        """测试计算返回成本汇总"""
        calculator = S3GlacierCalculator()
        result = calculator.calculate(sample_input)

        assert result.monthly_total > 0
        assert result.breakdown.retrieval_cost > 0  # Glacier 有检索费用

    def test_glacier_has_lower_storage_cost(self, sample_input):
        """测试 Glacier 存储费用更低"""
        from app.services.calculator.s3_standard import S3StandardCalculator

        glacier_calc = S3GlacierCalculator()
        standard_calc = S3StandardCalculator()

        glacier_result = glacier_calc.calculate(sample_input)

        sample_input.technical.storage_class = StorageClass.STANDARD
        standard_result = standard_calc.calculate(sample_input)

        # Glacier 存储费用应该更低
        assert glacier_result.breakdown.storage_cost < standard_result.breakdown.storage_cost

    def test_glacier_has_higher_request_cost(self, sample_input):
        """测试 Glacier 请求费用更高"""
        from app.services.calculator.s3_standard import S3StandardCalculator

        glacier_calc = S3GlacierCalculator()
        standard_calc = S3StandardCalculator()

        glacier_result = glacier_calc.calculate(sample_input)

        sample_input.technical.storage_class = StorageClass.STANDARD
        standard_result = standard_calc.calculate(sample_input)

        # Glacier PUT 请求费用应该更高
        assert glacier_result.breakdown.put_request_cost > standard_result.breakdown.put_request_cost
```

**Step 2: 运行测试确认失败**

Run: `cd backend && python -m pytest tests/test_s3_glacier.py -v`
Expected: FAIL

**Step 3: 实现 S3 Glacier 计算器**

```python
# backend/app/services/calculator/s3_glacier.py
"""S3 Glacier IR 存储成本计算器"""
from app.models.dimensions import CostCalculationInput
from app.models.results import CostBreakdown, CostSummary, IntermediateMetrics
from app.models.pricing import PricingLoader
from app.models.enums import StorageClass
from app.services.calculator.base import BaseCalculator


class S3GlacierCalculator:
    """S3 Glacier Instant Retrieval 存储类型计算器"""

    def calculate(self, input_data: CostCalculationInput) -> CostSummary:
        """
        计算 S3 Glacier IR 存储成本

        Args:
            input_data: 三类维度输入

        Returns:
            成本计算汇总
        """
        functional = input_data.functional
        pricing_dims = input_data.pricing

        # 加载定价数据
        pricing = PricingLoader.load(pricing_dims.region)
        storage_class = StorageClass.GLACIER_IR
        discount = pricing_dims.discount_percent

        # 计算中间指标
        daily_data_gb = BaseCalculator.calculate_daily_data_gb(functional)
        avg_storage_gb = BaseCalculator.calculate_avg_storage_gb(
            daily_data_gb,
            functional.retention_days,
        )
        monthly_puts = BaseCalculator.calculate_monthly_puts(functional, daily_data_gb)
        monthly_gets = BaseCalculator.calculate_monthly_gets(functional, monthly_puts)
        monthly_retrieval_gb = BaseCalculator.calculate_monthly_retrieval_gb(
            daily_data_gb,
            functional.access_pattern,
        )
        monthly_transfer_gb = BaseCalculator.calculate_monthly_transfer_gb(
            monthly_retrieval_gb,
        )

        # 计算各项费用
        storage_cost = (
            avg_storage_gb
            * pricing.get_storage_price(storage_class)
            * (1 - discount)
        )

        put_cost = (
            (monthly_puts / 1000)
            * pricing.get_put_price(storage_class)
            * (1 - discount)
        )

        get_cost = (
            (monthly_gets / 1000)
            * pricing.get_get_price(storage_class)
            * (1 - discount)
        )

        # Glacier 有检索费用
        retrieval_cost = (
            monthly_retrieval_gb
            * pricing.get_retrieval_price(storage_class)
            * (1 - discount)
        )

        # 数据传输费用
        transfer_cost = (
            monthly_transfer_gb
            * pricing.get_data_transfer_price(monthly_transfer_gb)
            * (1 - discount)
        )

        # 直接使用 Glacier 不需要生命周期转换费用
        lifecycle_cost = 0.0

        # 构建结果
        breakdown = CostBreakdown(
            storage_cost=storage_cost,
            put_request_cost=put_cost,
            get_request_cost=get_cost,
            retrieval_cost=retrieval_cost,
            data_transfer_cost=transfer_cost,
            lifecycle_cost=lifecycle_cost,
        )

        metrics = IntermediateMetrics(
            daily_data_gb=daily_data_gb,
            avg_storage_gb=avg_storage_gb,
            monthly_puts=monthly_puts,
            monthly_gets=monthly_gets,
            monthly_retrieval_gb=monthly_retrieval_gb,
            monthly_transfer_gb=monthly_transfer_gb,
        )

        monthly_total = breakdown.total
        per_device_monthly = monthly_total / functional.device_count

        return CostSummary(
            monthly_total=monthly_total,
            per_device_monthly=per_device_monthly,
            breakdown=breakdown,
            device_count=functional.device_count,
            metrics=metrics,
        )
```

**Step 4: 运行测试确认通过**

Run: `cd backend && python -m pytest tests/test_s3_glacier.py -v`
Expected: PASSED

**Step 5: 提交**

```bash
git add backend/app/services/calculator/s3_glacier.py backend/tests/test_s3_glacier.py
git commit -m "feat: 实现 S3 Glacier IR 成本计算器

- 计算存储、请求、检索、传输费用
- Glacier 存储费用低但请求费用高
- 增加检索费用计算"
```

---

*[由于篇幅限制，后续任务 (Task 2.4 - Task 7.5) 将按相同格式继续...]*

---

## 后续任务概览

### Phase 2 剩余任务
- **Task 2.4**: 实现生命周期混合策略计算器
- **Task 2.5**: 实现方案对比器
- **Task 2.6**: 实现优化推荐器
- **Task 2.7**: 实现敏感度分析器

### Phase 3: API 接口层
- **Task 3.1**: 成本计算接口 `/api/v1/calculate`
- **Task 3.2**: 方案对比接口 `/api/v1/compare`
- **Task 3.3**: 预设场景接口 `/api/v1/scenarios`
- **Task 3.4**: 定价查询接口 `/api/v1/pricing`

### Phase 4: 数据持久化
- **Task 4.1**: DynamoDB 客户端封装
- **Task 4.2**: 用户认证服务
- **Task 4.3**: 评估记录服务
- **Task 4.4**: 分享功能服务

### Phase 5: Excel 导出
- **Task 5.1**: Excel 模板设计
- **Task 5.2**: 报告生成器实现
- **Task 5.3**: 图表生成

### Phase 6: React 前端
- **Task 6.1**: 项目初始化与路由
- **Task 6.2**: 维度配置组件
- **Task 6.3**: 结果展示组件
- **Task 6.4**: 方案对比组件
- **Task 6.5**: 评估记录管理

### Phase 7: 集成与部署
- **Task 7.1**: Docker 配置
- **Task 7.2**: docker-compose 编排
- **Task 7.3**: 前后端集成测试
- **Task 7.4**: 部署文档

---

**计划完成并保存到 `docs/plans/2025-01-24-implementation-plan.md`。两种执行方式：**

**1. Subagent-Driven (当前会话)** - 我为每个任务调度新的子代理，任务间进行代码审查，快速迭代

**2. Parallel Session (独立会话)** - 在新会话中使用 executing-plans，批量执行并设置检查点

**选择哪种方式？**
