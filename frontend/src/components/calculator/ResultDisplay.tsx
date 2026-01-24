/**
 * 结果展示组件
 */
import React from 'react';
import { Card, Row, Col, Statistic, Button, Typography, Divider } from 'antd';
import { DownloadOutlined, DollarOutlined, PieChartOutlined } from '@ant-design/icons';
import type { CostSummary } from '../../types';
import CostPieChart from './CostPieChart';
import CostBreakdownTable from './CostBreakdownTable';

const { Title, Text } = Typography;

interface ResultDisplayProps {
  result: CostSummary;
  onExport?: () => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, onExport }) => {
  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <DollarOutlined /> 成本计算结果
          </Title>
        </Col>
        <Col>
          {onExport && (
            <Button type="primary" icon={<DownloadOutlined />} onClick={onExport}>
              导出 Excel
            </Button>
          )}
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="月度总费用"
              value={result.monthly_total}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="年度总费用"
              value={result.yearly_total}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="单设备月均费用"
              value={result.per_device_monthly}
              precision={4}
              prefix="$"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="设备数量"
              value={result.device_count}
              suffix="台"
            />
          </Card>
        </Col>
      </Row>

      <Divider orientationMargin="0"><Text strong>费用明细</Text></Divider>

      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <CostBreakdownTable
            breakdown={result.breakdown}
            metrics={result.metrics}
            monthlyTotal={result.monthly_total}
            pricingMetadata={result.pricing_metadata}
            detailedBreakdown={result.detailed_breakdown ? {
              storageCosts: result.detailed_breakdown.storage_costs?.map(c => ({
                name: c.name,
                unitPrice: c.unit_price,
                unitPriceUnit: c.unit_price_unit,
                quantity: c.quantity,
                quantityUnit: c.quantity_unit,
                amount: c.amount,
              })),
              dataTransferTiers: result.detailed_breakdown.data_transfer_tiers?.map(t => ({
                tierName: t.tier_name,
                rangeStartGb: t.range_start_gb,
                rangeEndGb: t.range_end_gb,
                unitPrice: t.unit_price,
                quantityGb: t.quantity_gb,
                amount: t.amount,
              })),
            } : undefined}
          />
        </Col>
        <Col xs={24} lg={10}>
          <Card
            size="small"
            title={
              <>
                <PieChartOutlined /> 费用构成
              </>
            }
          >
            <CostPieChart breakdown={result.breakdown} />
          </Card>
        </Col>
      </Row>

      {result.metrics && (
        <>
          <Divider orientationMargin="0"><Text strong>使用量指标</Text></Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="月度存储量"
                  value={result.metrics.avg_storage_gb}
                  precision={2}
                  suffix="GB"
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="月度 PUT 请求"
                  value={result.metrics.monthly_puts}
                  precision={0}
                  suffix="次"
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="月度数据传输"
                  value={result.metrics.monthly_transfer_gb}
                  precision={2}
                  suffix="GB"
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default ResultDisplay;
