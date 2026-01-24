"""Excel 报告导出服务"""
from io import BytesIO
from typing import Optional

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from openpyxl.utils import get_column_letter

from app.models.dimensions import CostCalculationInput
from app.models.results import CostSummary, ComparisonResult
from app.models.enums import RecordingMode, VideoQuality, StorageClass


class ExcelExporter:
    """Excel 报告导出器"""

    def __init__(self):
        # 样式定义
        self.header_font = Font(bold=True, size=12)
        self.title_font = Font(bold=True, size=16)
        self.header_fill = PatternFill(
            start_color="4472C4", end_color="4472C4", fill_type="solid"
        )
        self.header_font_white = Font(bold=True, size=11, color="FFFFFF")
        self.border = Border(
            left=Side(style="thin"),
            right=Side(style="thin"),
            top=Side(style="thin"),
            bottom=Side(style="thin"),
        )

    def generate(
        self,
        input_data: CostCalculationInput,
        result: CostSummary,
        comparison: Optional[ComparisonResult] = None,
        title: str = "IPC 云存储成本评估报告",
    ) -> bytes:
        """
        生成 Excel 报告

        Args:
            input_data: 输入参数
            result: 计算结果
            comparison: 方案对比结果（可选）
            title: 报告标题

        Returns:
            Excel 文件字节流
        """
        wb = Workbook()

        # 移除默认工作表
        wb.remove(wb.active)

        # 创建各工作表
        self._create_summary_sheet(wb, title, result)
        self._create_breakdown_sheet(wb, result)
        self._create_input_sheet(wb, input_data)

        if comparison:
            self._create_comparison_sheet(wb, comparison)

        # 保存到字节流
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        return output.read()

    def _create_summary_sheet(
        self, wb: Workbook, title: str, result: CostSummary
    ) -> None:
        """创建成本汇总表"""
        ws = wb.create_sheet("成本汇总")

        # 标题
        ws["A1"] = title
        ws["A1"].font = self.title_font
        ws.merge_cells("A1:D1")

        # 汇总数据
        row = 3
        summary_data = [
            ("月度总费用", f"${result.monthly_total:.2f}"),
            ("年度总费用", f"${result.yearly_total:.2f}"),
            ("单设备月均费用", f"${result.per_device_monthly:.4f}"),
            ("存储费用", f"${result.breakdown.storage_cost:.2f}"),
            ("PUT 请求费用", f"${result.breakdown.put_request_cost:.2f}"),
            ("GET 请求费用", f"${result.breakdown.get_request_cost:.2f}"),
        ]

        if result.breakdown.retrieval_cost:
            summary_data.append(("检索费用", f"${result.breakdown.retrieval_cost:.2f}"))
        if result.breakdown.data_transfer_cost:
            summary_data.append(("传输费用", f"${result.breakdown.data_transfer_cost:.2f}"))
        if result.breakdown.lifecycle_cost:
            summary_data.append(("生命周期转换费用", f"${result.breakdown.lifecycle_cost:.2f}"))

        for label, value in summary_data:
            ws[f"A{row}"] = label
            ws[f"B{row}"] = value
            ws[f"A{row}"].font = Font(bold=True)
            row += 1

        # 设置列宽
        ws.column_dimensions["A"].width = 20
        ws.column_dimensions["B"].width = 15

    def _create_breakdown_sheet(self, wb: Workbook, result: CostSummary) -> None:
        """创建费用明细表"""
        ws = wb.create_sheet("费用明细")

        # 表头
        headers = ["费用类型", "月度费用 ($)", "年度费用 ($)", "占比 (%)"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = self.header_font_white
            cell.fill = self.header_fill
            cell.border = self.border
            cell.alignment = Alignment(horizontal="center")

        # 费用明细
        breakdown_items = [
            ("存储费用", result.breakdown.storage_cost),
            ("PUT 请求费用", result.breakdown.put_request_cost),
            ("GET 请求费用", result.breakdown.get_request_cost),
        ]

        if result.breakdown.retrieval_cost:
            breakdown_items.append(("检索费用", result.breakdown.retrieval_cost))
        if result.breakdown.data_transfer_cost:
            breakdown_items.append(("传输费用", result.breakdown.data_transfer_cost))
        if result.breakdown.lifecycle_cost:
            breakdown_items.append(("生命周期转换费用", result.breakdown.lifecycle_cost))

        row = 2
        for label, monthly_cost in breakdown_items:
            yearly = monthly_cost * 12
            percentage = (monthly_cost / result.monthly_total * 100) if result.monthly_total > 0 else 0

            ws.cell(row=row, column=1, value=label).border = self.border
            ws.cell(row=row, column=2, value=f"{monthly_cost:.2f}").border = self.border
            ws.cell(row=row, column=3, value=f"{yearly:.2f}").border = self.border
            ws.cell(row=row, column=4, value=f"{percentage:.1f}%").border = self.border
            row += 1

        # 合计行
        ws.cell(row=row, column=1, value="合计").font = Font(bold=True)
        ws.cell(row=row, column=1).border = self.border
        ws.cell(row=row, column=2, value=f"{result.monthly_total:.2f}").border = self.border
        ws.cell(row=row, column=2).font = Font(bold=True)
        ws.cell(row=row, column=3, value=f"{result.yearly_total:.2f}").border = self.border
        ws.cell(row=row, column=3).font = Font(bold=True)
        ws.cell(row=row, column=4, value="100.0%").border = self.border

        # 设置列宽
        for col in range(1, 5):
            ws.column_dimensions[get_column_letter(col)].width = 18

    def _create_input_sheet(
        self, wb: Workbook, input_data: CostCalculationInput
    ) -> None:
        """创建输入参数表"""
        ws = wb.create_sheet("输入参数")

        # 功能维度
        ws["A1"] = "功能维度"
        ws["A1"].font = self.header_font
        ws.merge_cells("A1:B1")

        func = input_data.functional
        functional_params = [
            ("设备数量", func.device_count),
            ("录像模式", self._get_recording_mode_label(func.recording_mode)),
            ("视频质量", self._get_video_quality_label(func.video_quality)),
            ("每日事件数", func.events_per_day),
            ("事件时长 (秒)", func.event_duration_sec),
            ("保留天数", func.retention_days),
            ("回看比例", f"{func.access_pattern * 100:.0f}%"),
        ]

        row = 2
        for label, value in functional_params:
            ws[f"A{row}"] = label
            ws[f"B{row}"] = str(value)
            row += 1

        # 技术维度
        row += 1
        ws[f"A{row}"] = "技术维度"
        ws[f"A{row}"].font = self.header_font
        ws.merge_cells(f"A{row}:B{row}")
        row += 1

        tech = input_data.technical
        ws[f"A{row}"] = "存储类型"
        ws[f"B{row}"] = self._get_storage_class_label(tech.storage_class)
        row += 1

        # 价格维度
        row += 1
        ws[f"A{row}"] = "价格维度"
        ws[f"A{row}"].font = self.header_font
        ws.merge_cells(f"A{row}:B{row}")
        row += 1

        pricing = input_data.pricing
        pricing_params = [
            ("AWS 区域", pricing.region),
            ("折扣比例", f"{pricing.discount_percent}%"),
        ]

        for label, value in pricing_params:
            ws[f"A{row}"] = label
            ws[f"B{row}"] = str(value)
            row += 1

        # 设置列宽
        ws.column_dimensions["A"].width = 20
        ws.column_dimensions["B"].width = 25

    def _create_comparison_sheet(
        self, wb: Workbook, comparison: ComparisonResult
    ) -> None:
        """创建方案对比表"""
        ws = wb.create_sheet("方案对比")

        # 表头
        headers = ["存储方案", "月度费用 ($)", "年度费用 ($)", "相对基准"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = self.header_font_white
            cell.fill = self.header_fill
            cell.border = self.border
            cell.alignment = Alignment(horizontal="center")

        # 对比数据
        row = 2
        for item in comparison.items:
            # vs_baseline 是负值表示节省
            savings_text = f"{item.vs_baseline * 100:.1f}%" if item.vs_baseline != 0 else "-"

            ws.cell(row=row, column=1, value=item.name).border = self.border
            ws.cell(row=row, column=2, value=f"{item.monthly_cost:.2f}").border = self.border
            ws.cell(row=row, column=3, value=f"{item.yearly_cost:.2f}").border = self.border
            ws.cell(row=row, column=4, value=savings_text).border = self.border
            row += 1

        # 推荐方案
        if comparison.recommendation:
            row += 1
            ws[f"A{row}"] = "推荐方案"
            ws[f"A{row}"].font = Font(bold=True)
            ws[f"B{row}"] = comparison.recommendation.recommended_option
            row += 1
            ws[f"A{row}"] = "推荐理由"
            ws[f"B{row}"] = comparison.recommendation.reason

        # 设置列宽
        for col in range(1, 5):
            ws.column_dimensions[get_column_letter(col)].width = 18

    def _get_recording_mode_label(self, mode: RecordingMode) -> str:
        """获取录像模式标签"""
        labels = {
            RecordingMode.EVENT_TRIGGERED: "事件触发",
            RecordingMode.CONTINUOUS: "全天候录像",
            RecordingMode.SCHEDULED: "定时录像",
        }
        return labels.get(mode, str(mode))

    def _get_video_quality_label(self, quality: VideoQuality) -> str:
        """获取视频质量标签"""
        labels = {
            VideoQuality.P720: "720P (高清)",
            VideoQuality.P1080: "1080P (全高清)",
            VideoQuality.P2K: "2K (超清)",
            VideoQuality.P4K: "4K (超高清)",
        }
        return labels.get(quality, str(quality))

    def _get_storage_class_label(self, storage_class: StorageClass) -> str:
        """获取存储类型标签"""
        labels = {
            StorageClass.STANDARD: "S3 Standard",
            StorageClass.GLACIER_IR: "S3 Glacier Instant Retrieval",
        }
        return labels.get(storage_class, str(storage_class))
