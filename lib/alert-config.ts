/** Phân loại 2 mức độ theo yêu cầu: Nghiêm trọng | Cảnh báo. */
export type AlertSeverityLevel = "critical" | "warning";

export type AlertCategoryId =
  | "frequency"
  | "voltage"
  | "current"
  | "unbalance"
  | "harmonics"
  | "power"
  | "connectivity";

export type AlertConfig = {
  /** Mức độ mặc định theo danh mục lỗi (dùng trên trang Cảnh báo). */
  severityByCategory: Record<AlertCategoryId, AlertSeverityLevel>;
  /** Ngưỡng tiêu thụ vượt mức (kWh). */
  overConsumptionKwh?: string;
  /** Giới hạn tiêu thụ ngày (kWh). */
  dailyLimit?: number;
  /** Bật cảnh báo giờ cao điểm. */
  peakHourWarning?: boolean;
  /** Ngưỡng tần số thấp (Hz). */
  frequencyMinHz?: string;
  /** Ngưỡng tần số cao (Hz). */
  frequencyMaxHz?: string;
  /** Ngưỡng điện áp thấp (% hoặc V tùy cấu hình). */
  voltageMin?: string;
  /** Ngưỡng điện áp cao. */
  voltageMax?: string;
  /** Ngưỡng quá dòng (A). */
  currentMaxA?: string;
};

export const ALERT_CATEGORY_OPTIONS: { id: AlertCategoryId; label: string; hint: string }[] = [
  { id: "frequency", label: "Tần số", hint: "F, lệch tần số lưới" },
  { id: "voltage", label: "Điện áp", hint: "Sụt áp / quá áp" },
  { id: "current", label: "Dòng điện", hint: "Quá dòng" },
  { id: "unbalance", label: "Mất cân bằng pha", hint: "Lệch pha U/I" },
  { id: "harmonics", label: "Sóng hài", hint: "THD" },
  { id: "power", label: "Công suất", hint: "Giờ cao điểm / quá tải" },
  { id: "connectivity", label: "Kết nối", hint: "Mất gateway / RTU" },
];

export const DEFAULT_SEVERITY_BY_CATEGORY: Record<AlertCategoryId, AlertSeverityLevel> = {
  frequency: "warning",
  voltage: "warning",
  current: "critical",
  unbalance: "warning",
  harmonics: "warning",
  power: "warning",
  connectivity: "critical",
};

export function normalizeSeverityLevel(value: unknown): AlertSeverityLevel {
  if (value === "critical") return "critical";
  // "info" cũ → Cảnh báo (chỉ còn 2 mức)
  return "warning";
}

function asOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export function normalizeAlertConfig(raw: unknown): AlertConfig {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const map = source.severityByCategory;
  const severityByCategory = { ...DEFAULT_SEVERITY_BY_CATEGORY };
  if (map && typeof map === "object" && !Array.isArray(map)) {
    for (const option of ALERT_CATEGORY_OPTIONS) {
      const value = (map as Record<string, unknown>)[option.id];
      if (value === "critical" || value === "warning" || value === "info") {
        severityByCategory[option.id] = normalizeSeverityLevel(value);
      }
    }
  }
  return {
    severityByCategory,
    overConsumptionKwh: asOptionalString(source.overConsumptionKwh),
    dailyLimit: typeof source.dailyLimit === "number" ? source.dailyLimit : undefined,
    peakHourWarning: typeof source.peakHourWarning === "boolean" ? source.peakHourWarning : undefined,
    frequencyMinHz: asOptionalString(source.frequencyMinHz),
    frequencyMaxHz: asOptionalString(source.frequencyMaxHz),
    voltageMin: asOptionalString(source.voltageMin),
    voltageMax: asOptionalString(source.voltageMax),
    currentMaxA: asOptionalString(source.currentMaxA),
  };
}

export function resolveConfiguredSeverity(
  category: string | undefined,
  fallback: AlertSeverityLevel | "info" | string,
  config: AlertConfig,
): AlertSeverityLevel {
  if (category && category in config.severityByCategory) {
    return config.severityByCategory[category as AlertCategoryId];
  }
  return normalizeSeverityLevel(fallback);
}
