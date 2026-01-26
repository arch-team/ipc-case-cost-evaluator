/**
 * 导出 Excel 对话框
 */
import React, { useState } from 'react';
import { Modal, Form, Input, Checkbox, Button, Space, message } from 'antd';
import { DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { CostCalculationInput, CostSummary, ComparisonResult } from '../../types';
import { exportApi } from '../../api/client';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  input: CostCalculationInput;
  result: CostSummary;
  comparison?: ComparisonResult | null;
}

interface ExportOptions {
  includeParams: boolean;
  includeBreakdown: boolean;
  includeComparison: boolean;
  includeSensitivity: boolean;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  input,
  result,
  comparison,
}) => {
  const [loading, setLoading] = useState(false);
  const [reportName, setReportName] = useState(
    `成本评估报告_${new Date().toISOString().slice(0, 10)}`
  );
  const [options, setOptions] = useState<ExportOptions>({
    includeParams: true,
    includeBreakdown: true,
    includeComparison: true,
    includeSensitivity: false,
  });

  const handleExport = async () => {
    setLoading(true);
    try {
      const blob = await exportApi.exportExcel({
        input_data: input,
        result: {
          ...result,
          breakdown: result.breakdown,
          metrics: result.metrics
            ? {
                monthly_storage_gb: result.metrics.avg_storage_gb,
                monthly_puts: result.metrics.monthly_puts,
                monthly_gets: result.metrics.monthly_gets,
                monthly_retrieval_gb: result.metrics.monthly_retrieval_gb,
                monthly_transfer_gb: result.metrics.monthly_transfer_gb,
              }
            : undefined,
        } as unknown as CostSummary,
        comparison: options.includeComparison && comparison ? comparison : undefined,
        title: reportName,
      });

      // 下载文件
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      message.success('导出成功');
      onClose();
    } catch (error) {
      message.error('导出失败，请重试');
      console.error('导出错误:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (key: keyof ExportOptions, value: boolean) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Modal
      title={
        <Space>
          <FileExcelOutlined style={{ color: '#16a34a' }} />
          导出评估报告
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="export"
          type="primary"
          icon={<DownloadOutlined />}
          loading={loading}
          onClick={handleExport}
        >
          下载 Excel
        </Button>,
      ]}
      width={480}
    >
      <Form layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item label="报告名称">
          <Input
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            placeholder="输入报告名称"
            suffix=".xlsx"
          />
        </Form.Item>

        <Form.Item label="导出内容">
          <Space direction="vertical">
            <Checkbox
              checked={options.includeParams}
              onChange={(e) => handleOptionChange('includeParams', e.target.checked)}
            >
              参数配置摘要
            </Checkbox>
            <Checkbox
              checked={options.includeBreakdown}
              onChange={(e) => handleOptionChange('includeBreakdown', e.target.checked)}
            >
              费用明细表格
            </Checkbox>
            <Checkbox
              checked={options.includeComparison}
              onChange={(e) => handleOptionChange('includeComparison', e.target.checked)}
              disabled={!comparison}
            >
              方案对比分析
              {!comparison && <span style={{ color: '#999' }}> (无对比数据)</span>}
            </Checkbox>
            <Checkbox
              checked={options.includeSensitivity}
              onChange={(e) => handleOptionChange('includeSensitivity', e.target.checked)}
            >
              敏感度分析数据（可选）
            </Checkbox>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ExportDialog;
