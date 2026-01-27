"""AWS 区域数据模型

统一的 AWS 区域数据源，供整个系统使用。
所有需要区域信息的模块应从此处导入，避免重复定义。
"""
from typing import Dict, List, NamedTuple


class RegionInfo(NamedTuple):
    """区域信息"""
    code: str           # 区域代码，如 "ap-northeast-1"
    name_en: str        # 英文名称，如 "Asia Pacific (Tokyo)"
    name_zh: str        # 中文名称，如 "亚太地区 (东京)"
    name_zh_short: str  # 中文简称，如 "东京"


# 所有支持的 AWS 区域（唯一数据源）
AWS_REGIONS: List[RegionInfo] = [
    # 美洲
    RegionInfo("us-east-1", "US East (N. Virginia)", "美国东部 (弗吉尼亚北部)", "弗吉尼亚"),
    RegionInfo("us-east-2", "US East (Ohio)", "美国东部 (俄亥俄)", "俄亥俄"),
    RegionInfo("us-west-1", "US West (N. California)", "美国西部 (加利福尼亚北部)", "加利福尼亚"),
    RegionInfo("us-west-2", "US West (Oregon)", "美国西部 (俄勒冈)", "俄勒冈"),
    RegionInfo("ca-central-1", "Canada (Montreal)", "加拿大 (蒙特利尔)", "蒙特利尔"),
    RegionInfo("ca-west-1", "Canada (Calgary)", "加拿大西部 (卡尔加里)", "卡尔加里"),
    RegionInfo("sa-east-1", "South America (São Paulo)", "南美洲 (圣保罗)", "圣保罗"),
    # 欧洲
    RegionInfo("eu-west-1", "Europe (Ireland)", "欧洲 (爱尔兰)", "爱尔兰"),
    RegionInfo("eu-west-2", "Europe (London)", "欧洲 (伦敦)", "伦敦"),
    RegionInfo("eu-west-3", "Europe (Paris)", "欧洲 (巴黎)", "巴黎"),
    RegionInfo("eu-central-1", "Europe (Frankfurt)", "欧洲 (法兰克福)", "法兰克福"),
    RegionInfo("eu-central-2", "Europe (Zurich)", "欧洲 (苏黎世)", "苏黎世"),
    RegionInfo("eu-north-1", "Europe (Stockholm)", "欧洲 (斯德哥尔摩)", "斯德哥尔摩"),
    RegionInfo("eu-south-1", "Europe (Milan)", "欧洲 (米兰)", "米兰"),
    RegionInfo("eu-south-2", "Europe (Spain)", "欧洲 (西班牙)", "西班牙"),
    # 亚太地区
    RegionInfo("ap-northeast-1", "Asia Pacific (Tokyo)", "亚太地区 (东京)", "东京"),
    RegionInfo("ap-northeast-2", "Asia Pacific (Seoul)", "亚太地区 (首尔)", "首尔"),
    RegionInfo("ap-northeast-3", "Asia Pacific (Osaka)", "亚太地区 (大阪)", "大阪"),
    RegionInfo("ap-southeast-1", "Asia Pacific (Singapore)", "亚太地区 (新加坡)", "新加坡"),
    RegionInfo("ap-southeast-2", "Asia Pacific (Sydney)", "亚太地区 (悉尼)", "悉尼"),
    RegionInfo("ap-southeast-3", "Asia Pacific (Jakarta)", "亚太地区 (雅加达)", "雅加达"),
    RegionInfo("ap-southeast-4", "Asia Pacific (Melbourne)", "亚太地区 (墨尔本)", "墨尔本"),
    RegionInfo("ap-southeast-5", "Asia Pacific (Malaysia)", "亚太地区 (马来西亚)", "马来西亚"),
    RegionInfo("ap-south-1", "Asia Pacific (Mumbai)", "亚太地区 (孟买)", "孟买"),
    RegionInfo("ap-south-2", "Asia Pacific (Hyderabad)", "亚太地区 (海得拉巴)", "海得拉巴"),
    RegionInfo("ap-east-1", "Asia Pacific (Hong Kong)", "亚太地区 (香港)", "香港"),
    # 中东和非洲
    RegionInfo("me-south-1", "Middle East (Bahrain)", "中东 (巴林)", "巴林"),
    RegionInfo("me-central-1", "Middle East (UAE)", "中东 (阿联酋)", "阿联酋"),
    RegionInfo("il-central-1", "Israel (Tel Aviv)", "以色列 (特拉维夫)", "特拉维夫"),
    RegionInfo("af-south-1", "Africa (Cape Town)", "非洲 (开普敦)", "开普敦"),
]


# 便捷查询字典
REGION_BY_CODE: Dict[str, RegionInfo] = {r.code: r for r in AWS_REGIONS}

# 兼容性字典（英文名称映射，供旧代码使用）
REGION_NAMES_EN: Dict[str, str] = {r.code: r.name_en for r in AWS_REGIONS}

# 中文名称映射
REGION_NAMES_ZH: Dict[str, str] = {r.code: r.name_zh for r in AWS_REGIONS}

# 中文简称映射
REGION_NAMES_ZH_SHORT: Dict[str, str] = {r.code: r.name_zh_short for r in AWS_REGIONS}


def get_region_name(code: str, lang: str = "en") -> str:
    """获取区域名称

    Args:
        code: 区域代码
        lang: 语言，"en" 英文，"zh" 中文，"zh_short" 中文简称

    Returns:
        区域名称，如果不存在返回区域代码
    """
    region = REGION_BY_CODE.get(code)
    if not region:
        return code

    if lang == "zh":
        return region.name_zh
    elif lang == "zh_short":
        return region.name_zh_short
    else:
        return region.name_en


def get_all_region_codes() -> List[str]:
    """获取所有区域代码列表"""
    return [r.code for r in AWS_REGIONS]
