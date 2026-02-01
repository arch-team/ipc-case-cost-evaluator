/**
 * 用户个性化区域组件
 * 包含欢迎信息、使用统计、快捷操作和最近记录
 */
import { Card, Row, Col, Statistic, Button, Typography, Space, List, Empty, Skeleton } from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  CalculatorOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { CalculationRecordSummary } from '../../types/calculationRecords';
import type { User } from '../../types/auth';

const { Title, Text } = Typography;

interface UserDashboardProps {
  user: User;
  recentRecords: CalculationRecordSummary[];
  recordCount: number;
  userDataLoading: boolean;
}

export function UserDashboard({ user, recentRecords, recordCount, userDataLoading }: UserDashboardProps) {
  const navigate = useNavigate();

  return (
    <Card
      style={{
        marginBottom: 24,
        borderRadius: 16,
        border: 'none',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        background: 'linear-gradient(135deg, #f0f5ff 0%, #ffffff 100%)',
      }}
    >
      <Row gutter={[24, 24]} align="middle">
        {/* 欢迎信息 */}
        <Col xs={24} md={8}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 24,
              }}
            >
              <UserOutlined />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
                欢迎回来，{user.name || user.email?.split('@')[0]}
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                继续您的成本评估工作
              </Text>
            </div>
          </div>
        </Col>

        {/* 使用统计 */}
        <Col xs={12} md={4}>
          <Skeleton loading={userDataLoading} paragraph={false} active>
            <Statistic
              title="已保存记录"
              value={recordCount}
              suffix="条"
              valueStyle={{ color: '#1890ff', fontWeight: 600 }}
              prefix={<FileTextOutlined />}
            />
          </Skeleton>
        </Col>

        {/* 快捷操作 */}
        <Col xs={24} md={12}>
          <Space wrap>
            <Button
              type="primary"
              icon={<CalculatorOutlined />}
              onClick={() => navigate('/calculator')}
            >
              新建计算
            </Button>
            <Button
              icon={<FileTextOutlined />}
              onClick={() => navigate('/detailed-calculation')}
            >
              详细核算
            </Button>
            <Button
              icon={<HistoryOutlined />}
              onClick={() => navigate('/calculation-records')}
            >
              查看记录
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 最近记录列表 */}
      {recentRecords.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text strong style={{ fontSize: 14 }}>
              <ClockCircleOutlined style={{ marginRight: 8 }} />
              最近记录
            </Text>
            <Button type="link" size="small" onClick={() => navigate('/calculation-records')}>
              查看全部 <ArrowRightOutlined />
            </Button>
          </div>
          <List
            size="small"
            dataSource={recentRecords}
            renderItem={(record) => (
              <List.Item
                style={{ padding: '8px 0', cursor: 'pointer' }}
                onClick={() => navigate(`/calculation-records/${record.record_id}`)}
              >
                <List.Item.Meta
                  title={
                    <span style={{ fontSize: 13 }}>
                      {record.name}
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                        ${record.total_cost?.toFixed(2)}/月
                      </Text>
                    </span>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(record.created_at).toLocaleDateString('zh-CN')}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      )}

      {/* 无记录时的提示 */}
      {!userDataLoading && recentRecords.length === 0 && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #f0f0f0' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无核算记录"
            style={{ margin: '12px 0' }}
          >
            <Button type="primary" onClick={() => navigate('/detailed-calculation')}>
              创建第一条记录
            </Button>
          </Empty>
        </div>
      )}
    </Card>
  );
}