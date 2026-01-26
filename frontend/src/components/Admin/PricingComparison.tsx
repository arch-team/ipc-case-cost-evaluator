/**
 * 定价对比组件
 *
 * 支持多区域、多存储类型的定价对比分析
 * - 最多选择 3 个区域进行对比
 * - 支持表格和图表两种视图
 * - 计算价格差异百分比
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Select,
  Table,
  Space,
  Typography,
  Segmented,
  Tag,
  Alert,
  Spin,
  Empty,
  Tooltip,
  Row,
  Col,
} from 'antd';
import {
  TableOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { Column } from '@ant-design/charts';
import type { RegionInfo, PricingDetailResponse, StorageClass } from '../../types';

const { Text, Title } = Typography;

// 最大可选区域数
const MAX_REGIONS = 3;

// 存储类型选项
const STORAGE_CLASS_OPTIONS: { value: StorageClass; label: string }[] = [
  { value: 'STANDARD', label: 'S3 Standard' },
  { value: 'INTELLIGENT_TIERING', label: 'Intelligent-Tiering' },
  { value: 'STANDARD_IA', label: 'Standard-IA' },
  { value: 'ONEZONE_IA', label: 'One Zone-IA' },
  { value: 'GLACIER_IR', label: 'Glacier IR' },
  { value: 'GLACIER_FR', label: 'Glacier FR' },
  { value: 'DEEP_ARCHIVE', label: 'Deep Archive' },
];

// 计费项配置
const PRICING_ITEMS = [
  { key: 'storage_per_gb_month', name: '存储费用', unit: '$/GB-月' },
  { key: 'put_per_1000', name: 'PUT 请求', unit: '$/千次' },
  { key: 'get_per_1000', name: 'GET 请求', unit: '$/千次' },
  { key: 'retrieval_per_gb', name: '检索费用', unit: '$/GB' },
  { key: 'lifecycle_transition_per_1000', name: '生命周期转换', unit: '$/千次' },
];

// 区域颜色配置（参考方案对比的配色，更鲜明区分）
const REGION_COLORS = ['#7B68EE', '#52C41A', '#1890FF'];

interface PricingComparisonProps {
  regions: RegionInfo[];
  onLoadPricing: (region: string) => Promise<PricingDetailResponse>;
}

type ViewMode = 'table' | 'chart';

interface TableDataItem {
  key: string;
  priceItem: string;
  unit: string;
  [regionKey: string]: string | number | null;
}

interface ChartDataItem {
  region: string;
  regionCode: string;
  priceItem: string;
  value: number;
}

const PricingComparison: React.FC<PricingComparisonProps> = ({
  regions,
  onLoadPricing,
}) => {
  // 状态
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedStorageClass, setSelectedStorageClass] = useState<StorageClass>('STANDARD');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [pricingData, setPricingData] = useState<Map<string, PricingDetailResponse>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载选中区域的定价数据
  const loadPricingData = useCallback(async (regionCodes: string[]) => {
    if (regionCodes.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // 过滤出尚未缓存的区域
      const newRegions = regionCodes.filter(r => !pricingData.has(r));

      if (newRegions.length > 0) {
        const results = await Promise.all(
          newRegions.map(async region => {
            try {
              const data = await onLoadPricing(region);
              return { region, data };
            } catch {
              return { region, data: null };
            }
          })
        );

        // 更新缓存
        setPricingData(prev => {
          const newMap = new Map(prev);
          results.forEach(({ region, data }) => {
            if (data) {
              newMap.set(region, data);
            }
          });
          return newMap;
        });

        // 检查是否有加载失败的区域
        const failedRegions = results.filter(r => !r.data).map(r => r.region);
        if (failedRegions.length > 0) {
          setError(`部分区域加载失败: ${failedRegions.join(', ')}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载定价数据失败');
    } finally {
      setLoading(false);
    }
  }, [onLoadPricing, pricingData]);

  // 区域选择变化时加载数据
  useEffect(() => {
    if (selectedRegions.length > 0) {
      loadPricingData(selectedRegions);
    }
  }, [selectedRegions, loadPricingData]);

  // 处理区域选择变化
  const handleRegionChange = (values: string[]) => {
    if (values.length > MAX_REGIONS) {
      // 只保留最后选择的 3 个
      setSelectedRegions(values.slice(-MAX_REGIONS));
    } else {
      setSelectedRegions(values);
    }
  };

  // 获取区域显示名称
  const getRegionName = useCallback((regionCode: string) => {
    const region = regions.find(r => r.region === regionCode);
    return region?.name || regionCode;
  }, [regions]);

  // 计算差异百分比（相对于第一个区域）
  const calculateDiff = useCallback((baseValue: number, compareValue: number): number | null => {
    if (baseValue === 0) return null;
    return ((compareValue - baseValue) / baseValue) * 100;
  }, []);

  // 生成表格数据
  const tableData = useMemo((): TableDataItem[] => {
    if (selectedRegions.length === 0) return [];

    return PRICING_ITEMS.map(item => {
      const row: TableDataItem = {
        key: item.key,
        priceItem: item.name,
        unit: item.unit,
      };

      selectedRegions.forEach(region => {
        const pricing = pricingData.get(region);
        if (pricing?.storage_classes?.[selectedStorageClass]) {
          const value = pricing.storage_classes[selectedStorageClass][
            item.key as keyof typeof pricing.storage_classes[typeof selectedStorageClass]
          ];
          row[region] = typeof value === 'number' ? value : 0;
        } else {
          row[region] = null;
        }
      });

      return row;
    });
  }, [selectedRegions, selectedStorageClass, pricingData]);

  // 生成图表数据
  const chartData = useMemo((): ChartDataItem[] => {
    if (selectedRegions.length === 0) return [];

    const data: ChartDataItem[] = [];

    PRICING_ITEMS.forEach(item => {
      selectedRegions.forEach(region => {
        const pricing = pricingData.get(region);
        if (pricing?.storage_classes?.[selectedStorageClass]) {
          const value = pricing.storage_classes[selectedStorageClass][
            item.key as keyof typeof pricing.storage_classes[typeof selectedStorageClass]
          ];
          if (typeof value === 'number' && value > 0) {
            data.push({
              region: getRegionName(region),
              regionCode: region,
              priceItem: item.name,
              value,
            });
          }
        }
      });
    });

    return data;
  }, [selectedRegions, selectedStorageClass, pricingData, getRegionName]);

  // 动态生成表格列
  const tableColumns = useMemo(() => {
    const columns: Array<{
      title: React.ReactNode;
      dataIndex: string;
      key: string;
      width?: number;
      align?: 'left' | 'center' | 'right';
      fixed?: 'left' | 'right';
      render?: (value: unknown, record: TableDataItem) => React.ReactNode;
    }> = [
      {
        title: '计费项',
        dataIndex: 'priceItem',
        key: 'priceItem',
        width: 140,
        fixed: 'left',
      },
      {
        title: '单位',
        dataIndex: 'unit',
        key: 'unit',
        width: 100,
      },
    ];

    // 添加区域列
    selectedRegions.forEach((region, index) => {
      columns.push({
        title: (
          <Space>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: REGION_COLORS[index],
              }}
            />
            <span>{getRegionName(region)}</span>
          </Space>
        ),
        dataIndex: region,
        key: region,
        align: 'right',
        width: 150,
        render: (value: unknown) => {
          if (value === null || value === undefined) {
            return <Text type="secondary">-</Text>;
          }
          const numValue = value as number;
          return (
            <Text strong style={{ color: '#1677ff' }}>
              ${numValue.toFixed(4)}
            </Text>
          );
        },
      });
    });

    // 添加差异列（当有 2 个及以上区域时）
    if (selectedRegions.length >= 2) {
      columns.push({
        title: (
          <Tooltip title="相对于第一个区域的价格差异">
            <Space>
              <SwapOutlined />
              差异
            </Space>
          </Tooltip>
        ),
        dataIndex: 'diff',
        key: 'diff',
        align: 'center',
        width: 120,
        render: (_: unknown, record: TableDataItem) => {
          const baseRegion = selectedRegions[0];
          const baseValue = record[baseRegion] as number | null;
          if (baseValue === null || baseValue === 0) {
            return <Text type="secondary">-</Text>;
          }

          // 找出最大差异
          let maxDiff = 0;
          let maxDiffRegion = '';

          selectedRegions.slice(1).forEach(region => {
            const compareValue = record[region] as number | null;
            if (compareValue !== null) {
              const diff = calculateDiff(baseValue, compareValue);
              if (diff !== null && Math.abs(diff) > Math.abs(maxDiff)) {
                maxDiff = diff;
                maxDiffRegion = region;
              }
            }
          });

          if (maxDiffRegion === '') {
            return <Text type="secondary">0%</Text>;
          }

          const isPositive = maxDiff > 0;

          return (
            <Tooltip title={`相对于 ${getRegionName(baseRegion)}`}>
              <Tag color={isPositive ? 'error' : 'success'} style={{ margin: 0 }}>
                {isPositive ? '+' : ''}{maxDiff.toFixed(1)}%
              </Tag>
            </Tooltip>
          );
        },
      });
    }

    return columns;
  }, [selectedRegions, getRegionName, calculateDiff]);

  // 获取区域显示名称列表（用于颜色映射的 domain）
  const regionNames = useMemo(() => {
    return selectedRegions.map(region => getRegionName(region));
  }, [selectedRegions, getRegionName]);

  // 图表配置
  const chartConfig = useMemo(() => ({
    data: chartData,
    xField: 'priceItem',
    yField: 'value',
    colorField: 'region',
    transform: [{ type: 'dodgeX' }],
    scale: {
      x: {
        type: 'band',
        padding: 0.3,
      },
      color: {
        type: 'ordinal',
        domain: regionNames,
        range: REGION_COLORS.slice(0, selectedRegions.length),
      },
    },
    style: {
      radiusTopLeft: 4,
      radiusTopRight: 4,
      maxWidth: 40,
    },
    label: {
      text: (datum: ChartDataItem) => {
        if (datum.value >= 0.01) {
          return `$${datum.value.toFixed(3)}`;
        }
        return `$${datum.value.toFixed(4)}`;
      },
      position: 'top',
      dy: -8,
      style: {
        fontSize: 10,
        fill: '#333',
        fontWeight: 500,
      },
    },
    clip: false,
    marginTop: 30,
    legend: false,
    tooltip: {
      items: [
        {
          channel: 'y',
          valueFormatter: (v: number) => `$${v.toFixed(4)}`,
        },
      ],
    },
    axis: {
      y: {
        labelFormatter: (v: number) => `$${v}`,
      },
    },
  }), [chartData, regionNames, selectedRegions.length]);

  // 空状态
  if (selectedRegions.length === 0) {
    return (
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size={8}>
              <Text type="secondary">请选择要对比的区域</Text>
              <Select
                mode="multiple"
                style={{ width: 400 }}
                placeholder="选择区域（最多 3 个）"
                value={selectedRegions}
                onChange={handleRegionChange}
                maxTagCount={3}
                options={regions.map(r => ({
                  value: r.region,
                  label: `${r.name} (${r.region})`,
                }))}
              />
            </Space>
          }
        />
      </Card>
    );
  }

  return (
    <div>
      {/* 控制面板 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">对比区域（最多 {MAX_REGIONS} 个）</Text>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="选择区域"
                value={selectedRegions}
                onChange={handleRegionChange}
                maxTagCount={MAX_REGIONS}
                options={regions.map(r => ({
                  value: r.region,
                  label: `${r.name} (${r.region})`,
                }))}
              />
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">存储类型</Text>
              <Select
                style={{ width: '100%' }}
                value={selectedStorageClass}
                onChange={setSelectedStorageClass}
                options={STORAGE_CLASS_OPTIONS}
              />
            </Space>
          </Col>
          <Col xs={24} md={6}>
            <Space direction="vertical" size={4}>
              <Text type="secondary">视图模式</Text>
              <Segmented
                value={viewMode}
                onChange={v => setViewMode(v as ViewMode)}
                options={[
                  { value: 'table', icon: <TableOutlined />, label: '表格' },
                  { value: 'chart', icon: <BarChartOutlined />, label: '图表' },
                ]}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 提示信息 */}
      <Alert
        message={
          <Space>
            <InfoCircleOutlined />
            <span>
              已选择 {selectedRegions.length} 个区域进行对比。
              {selectedRegions.length >= 2 && '差异列显示相对于第一个选择区域的价格变化。'}
            </span>
          </Space>
        }
        type="info"
        style={{ marginBottom: 16 }}
      />

      {/* 对比内容 */}
      <Spin spinning={loading}>
        <Card
          title={
            <Space>
              <Title level={5} style={{ margin: 0 }}>
                {STORAGE_CLASS_OPTIONS.find(o => o.value === selectedStorageClass)?.label} 定价对比
              </Title>
              {selectedRegions.map((region, index) => (
                <Tag
                  key={region}
                  color={REGION_COLORS[index]}
                  style={{ marginLeft: index === 0 ? 8 : 0 }}
                >
                  {getRegionName(region)}
                </Tag>
              ))}
            </Space>
          }
        >
          {viewMode === 'table' ? (
            <Table
              columns={tableColumns}
              dataSource={tableData}
              pagination={false}
              size="middle"
              scroll={{ x: 'max-content' }}
            />
          ) : (
            <div style={{ height: 320 }}>
              {chartData.length > 0 ? (
                <Column {...chartConfig} />
              ) : (
                <Empty description="暂无图表数据" />
              )}
            </div>
          )}
        </Card>
      </Spin>
    </div>
  );
};

export default PricingComparison;
