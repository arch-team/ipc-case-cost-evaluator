"""预设场景 API 路由"""
import json
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/scenarios", tags=["场景"])


# 数据文件路径
PRESETS_FILE = Path(__file__).parent.parent.parent / "data" / "scenarios" / "presets.json"


class ScenarioFunctional(BaseModel):
    """场景功能维度"""
    device_count: int
    recording_mode: str
    video_quality: str
    events_per_day: Optional[int] = None
    event_duration_sec: Optional[int] = None
    retention_days: int
    access_pattern: float
    segment_strategy: Optional[str] = None
    segment_value: Optional[int] = None


class ScenarioTechnical(BaseModel):
    """场景技术维度"""
    storage_class: str


class ScenarioPricing(BaseModel):
    """场景价格维度"""
    region: str
    discount_percent: float = 0.0


class Scenario(BaseModel):
    """预设场景"""
    id: str
    name: str
    description: str
    category: str
    functional: ScenarioFunctional
    technical: ScenarioTechnical
    pricing: ScenarioPricing


class Category(BaseModel):
    """场景分类"""
    id: str
    name: str
    description: Optional[str] = None


class ScenariosResponse(BaseModel):
    """场景列表响应"""
    scenarios: List[Scenario]
    categories: List[Category] = []


class CategoriesResponse(BaseModel):
    """分类列表响应"""
    categories: List[Category]


def _load_presets() -> dict:
    """加载预设数据"""
    if not PRESETS_FILE.exists():
        return {"scenarios": [], "categories": []}

    with open(PRESETS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("", response_model=ScenariosResponse)
async def list_scenarios(
    category: Optional[str] = Query(default=None, description="按分类筛选"),
) -> ScenariosResponse:
    """
    获取预设场景列表

    Args:
        category: 按分类筛选（可选）

    Returns:
        预设场景列表
    """
    data = _load_presets()
    scenarios = data.get("scenarios", [])

    # 按分类筛选
    if category:
        scenarios = [s for s in scenarios if s.get("category") == category]

    # 同时返回分类信息
    categories = data.get("categories", [])
    return ScenariosResponse(scenarios=scenarios, categories=categories)


@router.get("/categories", response_model=CategoriesResponse)
async def list_categories() -> CategoriesResponse:
    """
    获取场景分类列表

    Returns:
        分类列表
    """
    data = _load_presets()
    categories = data.get("categories", [])
    return CategoriesResponse(categories=categories)


@router.get("/{scenario_id}", response_model=Scenario)
async def get_scenario(scenario_id: str) -> Scenario:
    """
    获取单个预设场景

    Args:
        scenario_id: 场景 ID

    Returns:
        场景详情
    """
    data = _load_presets()
    scenarios = data.get("scenarios", [])

    for scenario in scenarios:
        if scenario.get("id") == scenario_id:
            return Scenario(**scenario)

    raise HTTPException(status_code=404, detail=f"场景 {scenario_id} 不存在")
