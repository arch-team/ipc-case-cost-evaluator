/**
 * AWS 区域数据 - 统一数据源
 *
 * 所有需要区域信息的组件应从此处导入，避免重复定义。
 */

export interface RegionInfo {
  code: string;       // 区域代码，如 "ap-northeast-1"
  nameEn: string;     // 英文名称，如 "Asia Pacific (Tokyo)"
  nameZh: string;     // 中文名称，如 "亚太地区 (东京)"
  nameZhShort: string; // 中文简称，如 "东京"
}

/**
 * 所有支持的 AWS 区域（唯一数据源）
 */
export const AWS_REGIONS: RegionInfo[] = [
  // 美洲
  { code: 'us-east-1', nameEn: 'US East (N. Virginia)', nameZh: '美国东部 (弗吉尼亚北部)', nameZhShort: '弗吉尼亚' },
  { code: 'us-east-2', nameEn: 'US East (Ohio)', nameZh: '美国东部 (俄亥俄)', nameZhShort: '俄亥俄' },
  { code: 'us-west-1', nameEn: 'US West (N. California)', nameZh: '美国西部 (加利福尼亚北部)', nameZhShort: '加利福尼亚' },
  { code: 'us-west-2', nameEn: 'US West (Oregon)', nameZh: '美国西部 (俄勒冈)', nameZhShort: '俄勒冈' },
  { code: 'ca-central-1', nameEn: 'Canada (Montreal)', nameZh: '加拿大 (蒙特利尔)', nameZhShort: '蒙特利尔' },
  { code: 'ca-west-1', nameEn: 'Canada (Calgary)', nameZh: '加拿大西部 (卡尔加里)', nameZhShort: '卡尔加里' },
  { code: 'sa-east-1', nameEn: 'South America (São Paulo)', nameZh: '南美洲 (圣保罗)', nameZhShort: '圣保罗' },
  // 欧洲
  { code: 'eu-west-1', nameEn: 'Europe (Ireland)', nameZh: '欧洲 (爱尔兰)', nameZhShort: '爱尔兰' },
  { code: 'eu-west-2', nameEn: 'Europe (London)', nameZh: '欧洲 (伦敦)', nameZhShort: '伦敦' },
  { code: 'eu-west-3', nameEn: 'Europe (Paris)', nameZh: '欧洲 (巴黎)', nameZhShort: '巴黎' },
  { code: 'eu-central-1', nameEn: 'Europe (Frankfurt)', nameZh: '欧洲 (法兰克福)', nameZhShort: '法兰克福' },
  { code: 'eu-central-2', nameEn: 'Europe (Zurich)', nameZh: '欧洲 (苏黎世)', nameZhShort: '苏黎世' },
  { code: 'eu-north-1', nameEn: 'Europe (Stockholm)', nameZh: '欧洲 (斯德哥尔摩)', nameZhShort: '斯德哥尔摩' },
  { code: 'eu-south-1', nameEn: 'Europe (Milan)', nameZh: '欧洲 (米兰)', nameZhShort: '米兰' },
  { code: 'eu-south-2', nameEn: 'Europe (Spain)', nameZh: '欧洲 (西班牙)', nameZhShort: '西班牙' },
  // 亚太地区
  { code: 'ap-northeast-1', nameEn: 'Asia Pacific (Tokyo)', nameZh: '亚太地区 (东京)', nameZhShort: '东京' },
  { code: 'ap-northeast-2', nameEn: 'Asia Pacific (Seoul)', nameZh: '亚太地区 (首尔)', nameZhShort: '首尔' },
  { code: 'ap-northeast-3', nameEn: 'Asia Pacific (Osaka)', nameZh: '亚太地区 (大阪)', nameZhShort: '大阪' },
  { code: 'ap-southeast-1', nameEn: 'Asia Pacific (Singapore)', nameZh: '亚太地区 (新加坡)', nameZhShort: '新加坡' },
  { code: 'ap-southeast-2', nameEn: 'Asia Pacific (Sydney)', nameZh: '亚太地区 (悉尼)', nameZhShort: '悉尼' },
  { code: 'ap-southeast-3', nameEn: 'Asia Pacific (Jakarta)', nameZh: '亚太地区 (雅加达)', nameZhShort: '雅加达' },
  { code: 'ap-southeast-4', nameEn: 'Asia Pacific (Melbourne)', nameZh: '亚太地区 (墨尔本)', nameZhShort: '墨尔本' },
  { code: 'ap-southeast-5', nameEn: 'Asia Pacific (Malaysia)', nameZh: '亚太地区 (马来西亚)', nameZhShort: '马来西亚' },
  { code: 'ap-south-1', nameEn: 'Asia Pacific (Mumbai)', nameZh: '亚太地区 (孟买)', nameZhShort: '孟买' },
  { code: 'ap-south-2', nameEn: 'Asia Pacific (Hyderabad)', nameZh: '亚太地区 (海得拉巴)', nameZhShort: '海得拉巴' },
  { code: 'ap-east-1', nameEn: 'Asia Pacific (Hong Kong)', nameZh: '亚太地区 (香港)', nameZhShort: '香港' },
  // 中东和非洲
  { code: 'me-south-1', nameEn: 'Middle East (Bahrain)', nameZh: '中东 (巴林)', nameZhShort: '巴林' },
  { code: 'me-central-1', nameEn: 'Middle East (UAE)', nameZh: '中东 (阿联酋)', nameZhShort: '阿联酋' },
  { code: 'il-central-1', nameEn: 'Israel (Tel Aviv)', nameZh: '以色列 (特拉维夫)', nameZhShort: '特拉维夫' },
  { code: 'af-south-1', nameEn: 'Africa (Cape Town)', nameZh: '非洲 (开普敦)', nameZhShort: '开普敦' },
];

/**
 * 区域代码到信息的映射
 */
export const REGION_BY_CODE: Record<string, RegionInfo> = Object.fromEntries(
  AWS_REGIONS.map(r => [r.code, r])
);

/**
 * 中文简称映射（用于摘要显示）
 */
export const REGION_NAMES_ZH_SHORT: Record<string, string> = Object.fromEntries(
  AWS_REGIONS.map(r => [r.code, r.nameZhShort])
);

/**
 * 完整中文名映射
 */
export const REGION_NAMES_ZH: Record<string, string> = Object.fromEntries(
  AWS_REGIONS.map(r => [r.code, r.nameZh])
);

/**
 * Ant Design Select 选项格式
 */
export const REGION_SELECT_OPTIONS = AWS_REGIONS.map(r => ({
  value: r.code,
  label: r.nameZh,
}));

/**
 * 获取区域名称
 * @param code 区域代码
 * @param format 格式: 'short' 简称, 'full' 完整中文, 'en' 英文
 */
export function getRegionName(code: string, format: 'short' | 'full' | 'en' = 'short'): string {
  const region = REGION_BY_CODE[code];
  if (!region) return code;

  switch (format) {
    case 'short':
      return region.nameZhShort;
    case 'full':
      return region.nameZh;
    case 'en':
      return region.nameEn;
    default:
      return region.nameZhShort;
  }
}
