export type AlertSeverityLevel = "critical" | "warning" | "info";

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
  overConsumptionKwh?: string;
  dailyLimit?: number;
  peakHourWarning?: boolean;
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
  harmonics: "info",
  power: "warning",
  connectivity: "critical",
};

export function normalizeAlertConfig(raw: unknown): AlertConfig {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const map = source.severityByCategory;
  const severityByCategory = { ...DEFAULT_SEVERITY_BY_CATEGORY };
  if (map && typeof map === "object" && !Array.isArray(map)) {
    for (const option of ALERT_CATEGORY_OPTIONS) {
      const value = (map as Record<string, unknown>)[option.id];
      if (value === "critical" || value === "warning" || value === "info") {
        severityByCategory[option.id] = value;
      }
    }
  }
  return {
    severityByCategory,
    overConsumptionKwh:
      typeof source.overConsumptionKwh === "string" ? source.overConsumptionKwh : undefined,
    dailyLimit: typeof source.dailyLimit === "number" ? source.dailyLimit : undefined,
    peakHourWarning: typeof source.peakHourWarning === "boolean" ? source.peakHourWarning : undefined,
  };
}

export function resolveConfiguredSeverity(
  category: string | undefined,
  fallback: AlertSeverityLevel,
  config: AlertConfig,
): AlertSeverityLevel {
  if (category && category in config.severityByCategory) {
    return config.severityByCategory[category as AlertCategoryId];
  }
  return fallback;
}
