"""
E2E 测试辅助函数
提供测试中常用的断言和数据构建功能
"""
from typing import Dict, Any


# 常量定义
EXCEL_MAGIC_NUMBER = b'PK'  # Excel 文件的魔数（PK zip 格式）
MIN_EXCEL_SIZE = 1024  # 最小 Excel 文件大小（字节）
COST_TOLERANCE = 0.01  # 成本计算误差容忍度
HTTP_OK = 200  # HTTP 成功状态码


def assert_valid_excel_file(content: bytes) -> None:
    """验证是否为有效的 Excel 文件

    Args:
        content: 文件内容字节
    """
    assert content[:2] == EXCEL_MAGIC_NUMBER, "不是有效的 Excel 文件格式"
    assert len(content) > MIN_EXCEL_SIZE, f"文件太小，应至少 {MIN_EXCEL_SIZE} 字节"


def assert_cost_calculation_result(result: Dict[str, Any]) -> None:
    """验证成本计算结果结构

    Args:
        result: 计算结果字典
    """
    # 验证必需字段
    required_fields = ["monthly_total", "per_device_monthly", "breakdown", "metrics"]
    for field in required_fields:
        assert field in result, f"缺少必需字段: {field}"

    # 验证成本为正数
    assert result["monthly_total"] > 0, "月度总成本应为正数"
    assert result["per_device_monthly"] > 0, "单设备月度成本应为正数"

    # 验证成本分解结构
    breakdown = result["breakdown"]
    breakdown_fields = ["storage_cost", "put_request_cost", "get_request_cost"]
    for field in breakdown_fields:
        assert field in breakdown, f"成本分解缺少字段: {field}"
        assert breakdown[field] >= 0, f"{field} 应为非负数"


def assert_costs_equal(actual: float, expected: float, tolerance: float = COST_TOLERANCE) -> None:
    """验证两个成本值是否在误差容忍范围内相等

    Args:
        actual: 实际成本
        expected: 期望成本
        tolerance: 误差容忍度
    """
    diff = abs(actual - expected)
    assert diff < tolerance, f"成本差异 {diff} 超过容忍度 {tolerance}"


def build_calculation_input(
    device_count: int = 100,
    recording_mode: str = "event_triggered",
    video_quality: str = "1080p",
    events_per_day: int = 400,
    event_duration_sec: int = 15,
    retention_days: int = 30,
    access_pattern: float = 0.1,
    storage_class: str = "STANDARD",
    region: str = "ap-northeast-1",
    discount_percent: float = 0.0,
    **kwargs
) -> Dict[str, Any]:
    """构建成本计算输入参数

    提供默认值，可通过关键字参数覆盖

    Returns:
        完整的计算输入字典
    """
    input_data = {
        "functional": {
            "device_count": device_count,
            "recording_mode": recording_mode,
            "video_quality": video_quality,
            "retention_days": retention_days,
            "access_pattern": access_pattern,
        },
        "technical": {
            "storage_class": storage_class,
        },
        "pricing": {
            "region": region,
            "discount_percent": discount_percent,
        }
    }

    # 根据录像模式添加特定参数
    if recording_mode == "event_triggered":
        input_data["functional"]["events_per_day"] = events_per_day
        input_data["functional"]["event_duration_sec"] = event_duration_sec
    elif recording_mode == "scheduled":
        input_data["functional"]["scheduled_hours"] = kwargs.get("scheduled_hours", 8)

    # 添加任何额外的参数
    for key, value in kwargs.items():
        if key not in ["scheduled_hours"]:  # 已处理的参数
            # 尝试将参数添加到合适的维度
            if key in ["lifecycle_transition_days"]:
                input_data["technical"][key] = value

    return input_data


def assert_api_response_ok(response) -> None:
    """验证 API 响应状态为 200

    Args:
        response: HTTP 响应对象
    """
    assert response.status_code == HTTP_OK, f"API 响应状态码 {response.status_code} 不是 200"


def assert_evaluation_data_matches(
    retrieved: Dict[str, Any],
    expected_input: Dict[str, Any],
    expected_result: Dict[str, Any]
) -> None:
    """验证评估数据与预期匹配

    Args:
        retrieved: 获取的评估数据
        expected_input: 期望的输入参数
        expected_result: 期望的计算结果
    """
    # 验证输入参数
    actual_input = retrieved["input_data"]
    for dimension in ["functional", "technical", "pricing"]:
        if dimension in expected_input:
            for key, expected_value in expected_input[dimension].items():
                actual_value = actual_input[dimension].get(key)
                assert actual_value == expected_value, \
                    f"{dimension}.{key}: 期望 {expected_value}, 实际 {actual_value}"

    # 验证结果数据
    actual_result = retrieved["result"]
    assert_costs_equal(actual_result["monthly_total"], expected_result["monthly_total"])
    assert_costs_equal(actual_result["per_device_monthly"], expected_result["per_device_monthly"])