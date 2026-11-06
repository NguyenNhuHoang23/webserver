export type ReportId =
  | "summary"
  | "consumption"
  | "cost"
  | "ghg"
  | "alerts"
  | "compare";

export type ReportFormat = "pdf" | "xlsx";

export type ReportField = {
  id: string;
  label: string;
  hint?: string;
};

export type ReportDefinition = {
  id: ReportId;
  name: string;
  title: string;
  description: string;
  fields: ReportField[];
  /** Các trường bật mặc định. */
  defaultFields: string[];
  needsMeterPoints: boolean;
  needsComparePeriod: boolean;
};

export const REPORT_TEMPLATE_NOTE =
  "File mẫu PDF/Excel và nội dung header/footer sẽ đồng bộ sau khi nhận mẫu từ a Phi.";

export const REPORTS: ReportDefinition[] = [
  {
    id: "summary",
    name: "Báo cáo tổng hợp",
    title: "BÁO CÁO TỔNG HỢP",
    description: "Tóm tắt điện năng, chi phí, GHG và cảnh báo trong kỳ.",
    needsMeterPoints: true,
    needsComparePeriod: false,
    defaultFields: ["energy_total", "cost_total", "ghg_total", "alert_count", "chart"],
    fields: [
      { id: "energy_total", label: "Tổng điện năng tiêu thụ", hint: "kWh" },
      { id: "cost_total", label: "Tổng chi phí", hint: "VND" },
      { id: "ghg_total", label: "Tổng phát thải CO₂e", hint: "tấn" },
      { id: "alert_count", label: "Số lượng cảnh báo" },
      { id: "chart", label: "Biểu đồ tổng quan" },
      { id: "summary_table", label: "Bảng tổng hợp" },
    ],
  },
  {
    id: "consumption",
    name: "Báo cáo tiêu hao",
    title: "ĐIỆN NĂNG TIÊU THỤ",
    description: "Tiêu thụ theo điểm đo / kỳ thời gian.",
    needsMeterPoints: true,
    needsComparePeriod: false,
    defaultFields: ["kwh_total", "kwh_by_point", "chart", "summary_table"],
    fields: [
      { id: "kwh_total", label: "Tổng kWh kỳ" },
      { id: "kwh_by_point", label: "kWh theo điểm đo" },
      { id: "peak_demand", label: "Công suất đỉnh" },
      { id: "chart", label: "Biểu đồ tiêu thụ" },
      { id: "summary_table", label: "Bảng tổng hợp" },
      { id: "detail_table", label: "Bảng chi tiết theo ngày/giờ" },
    ],
  },
  {
    id: "cost",
    name: "Báo cáo chi phí",
    title: "CHI PHÍ NĂNG LƯỢNG",
    description: "Chi phí theo biểu giá TOU / điểm đo.",
    needsMeterPoints: true,
    needsComparePeriod: false,
    defaultFields: ["cost_total", "cost_by_band", "chart", "summary_table"],
    fields: [
      { id: "cost_total", label: "Tổng chi phí (trước VAT)" },
      { id: "cost_by_band", label: "Chi phí theo khung giờ (BT/CD/CK)" },
      { id: "cost_by_point", label: "Chi phí theo điểm đo" },
      { id: "chart", label: "Biểu đồ chi phí" },
      { id: "summary_table", label: "Bảng tổng hợp" },
      { id: "detail_table", label: "Bảng chi tiết" },
    ],
  },
  {
    id: "ghg",
    name: "Khí nhà kính",
    title: "PHÁT THẢI KHÍ NHÀ KÍNH",
    description: "Phát thải CO₂e theo nguồn / phạm vi Scope.",
    needsMeterPoints: false,
    needsComparePeriod: false,
    defaultFields: ["ghg_total", "by_scope", "by_source", "chart"],
    fields: [
      { id: "ghg_total", label: "Tổng tấn CO₂e" },
      { id: "by_scope", label: "Phân bố theo Scope 1/2/3" },
      { id: "by_source", label: "Chi tiết theo nguồn phát thải" },
      { id: "chart", label: "Biểu đồ phân bố" },
      { id: "summary_table", label: "Bảng tổng hợp" },
    ],
  },
  {
    id: "alerts",
    name: "Cảnh báo",
    title: "NHẬT KÝ CẢNH BÁO",
    description: "Danh sách sự kiện cảnh báo trong kỳ (không gồm xử lý).",
    needsMeterPoints: true,
    needsComparePeriod: false,
    defaultFields: ["alert_list", "by_severity", "summary_table"],
    fields: [
      { id: "alert_list", label: "Danh sách sự kiện (thời điểm)" },
      { id: "by_severity", label: "Thống kê theo mức độ" },
      { id: "by_category", label: "Thống kê theo danh mục" },
      { id: "summary_table", label: "Bảng tổng hợp" },
      { id: "detail_table", label: "Bảng chi tiết đầy đủ" },
    ],
  },
  {
    id: "compare",
    name: "Báo cáo so sánh",
    title: "BÁO CÁO SO SÁNH",
    description: "So sánh hai kỳ (tháng này / tháng trước hoặc tùy chọn).",
    needsMeterPoints: true,
    needsComparePeriod: true,
    defaultFields: ["energy_delta", "cost_delta", "ghg_delta", "chart", "summary_table"],
    fields: [
      { id: "energy_delta", label: "Chênh lệch điện năng" },
      { id: "cost_delta", label: "Chênh lệch chi phí" },
      { id: "ghg_delta", label: "Chênh lệch GHG" },
      { id: "alert_delta", label: "Chênh lệch số cảnh báo" },
      { id: "chart", label: "Biểu đồ so sánh" },
      { id: "summary_table", label: "Bảng đối chiếu" },
    ],
  },
];

export function reportById(id: string) {
  return REPORTS.find((item) => item.id === id) ?? REPORTS[0];
}
