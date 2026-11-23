import { REPORTS, type ReportId } from "@/lib/report-defs";

export type ReportConfig = {
  /** Loại báo cáo hiện trên trang Báo cáo. */
  enabledReportIds: ReportId[];
  /** Trường được phép chọn / xuất theo từng loại. */
  availableFields: Partial<Record<ReportId, string[]>>;
  /** Trường chọn sẵn khi mở loại báo cáo. */
  defaultFields: Partial<Record<ReportId, string[]>>;
};

function allFieldIds(reportId: ReportId) {
  const def = REPORTS.find((item) => item.id === reportId);
  return def ? def.fields.map((field) => field.id) : [];
}

function defaultFieldIds(reportId: ReportId) {
  const def = REPORTS.find((item) => item.id === reportId);
  return def ? [...def.defaultFields] : [];
}

export function defaultReportConfig(): ReportConfig {
  const availableFields: Partial<Record<ReportId, string[]>> = {};
  const defaultFields: Partial<Record<ReportId, string[]>> = {};
  for (const report of REPORTS) {
    availableFields[report.id] = allFieldIds(report.id);
    defaultFields[report.id] = defaultFieldIds(report.id);
  }
  return {
    enabledReportIds: REPORTS.map((item) => item.id),
    availableFields,
    defaultFields,
  };
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const next = value.filter((item): item is string => typeof item === "string" && item.length > 0);
  return next.length ? next : undefined;
}

export function normalizeReportConfig(raw: unknown): ReportConfig {
  const base = defaultReportConfig();
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

  const enabledRaw = asStringArray(source.enabledReportIds);
  const enabledReportIds = enabledRaw
    ? (REPORTS.map((item) => item.id).filter((id) => enabledRaw.includes(id)) as ReportId[])
    : base.enabledReportIds;
  const safeEnabled =
    enabledReportIds.length > 0 ? enabledReportIds : ([REPORTS[0].id] as ReportId[]);

  const availableSource =
    source.availableFields && typeof source.availableFields === "object" && !Array.isArray(source.availableFields)
      ? (source.availableFields as Record<string, unknown>)
      : {};
  const defaultSource =
    source.defaultFields && typeof source.defaultFields === "object" && !Array.isArray(source.defaultFields)
      ? (source.defaultFields as Record<string, unknown>)
      : {};

  const availableFields: Partial<Record<ReportId, string[]>> = {};
  const defaultFields: Partial<Record<ReportId, string[]>> = {};

  for (const report of REPORTS) {
    const allowedAll = allFieldIds(report.id);
    const allowedSet = new Set(allowedAll);
    const available =
      asStringArray(availableSource[report.id])?.filter((id) => allowedSet.has(id)) ??
      base.availableFields[report.id] ??
      allowedAll;
    const safeAvailable = available.length ? available : allowedAll;
    availableFields[report.id] = safeAvailable;

    const availableSet = new Set(safeAvailable);
    const defaults =
      asStringArray(defaultSource[report.id])?.filter((id) => availableSet.has(id)) ??
      (base.defaultFields[report.id] ?? defaultFieldIds(report.id)).filter((id) => availableSet.has(id));
    defaultFields[report.id] = defaults.length ? defaults : [safeAvailable[0]];
  }

  return {
    enabledReportIds: safeEnabled,
    availableFields,
    defaultFields,
  };
}

export function visibleReports(config: ReportConfig) {
  const enabled = new Set(config.enabledReportIds);
  const list = REPORTS.filter((item) => enabled.has(item.id));
  return list.length ? list : [REPORTS[0]];
}

export function fieldsForReport(config: ReportConfig, reportId: ReportId) {
  const def = REPORTS.find((item) => item.id === reportId) ?? REPORTS[0];
  const allowed = new Set(config.availableFields[reportId] ?? def.fields.map((field) => field.id));
  const fields = def.fields.filter((field) => allowed.has(field.id));
  return fields.length ? fields : def.fields;
}

export function defaultFieldsForReport(config: ReportConfig, reportId: ReportId) {
  const available = fieldsForReport(config, reportId).map((field) => field.id);
  const availableSet = new Set(available);
  const configured = (config.defaultFields[reportId] ?? []).filter((id) => availableSet.has(id));
  if (configured.length) return configured;
  const def = REPORTS.find((item) => item.id === reportId);
  const fallback = (def?.defaultFields ?? []).filter((id) => availableSet.has(id));
  return fallback.length ? fallback : available.slice(0, 1);
}
