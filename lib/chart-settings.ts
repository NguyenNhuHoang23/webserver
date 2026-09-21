export type ChartMetricId = "energy" | "ui" | "freq" | "power" | "harm" | "unbalance" | "pst";

export type ChartMetricVisibility = Record<ChartMetricId, boolean>;

export type ChartVisibilitySettings = {
  project: ChartMetricVisibility;
  meters: Record<string, Partial<ChartMetricVisibility>>;
};

export const CHART_METRICS: { id: ChartMetricId; label: string; hint: string }[] = [
  { id: "energy", label: "Energy", hint: "Tiêu thụ năng lượng" },
  { id: "ui", label: "U / I", hint: "Điện áp và dòng điện" },
  { id: "freq", label: "Tần số", hint: "Tần số lưới điện" },
  { id: "power", label: "Công suất", hint: "Công suất tức thời" },
  { id: "harm", label: "Sóng hài", hint: "Độ méo sóng hài (THD)" },
  { id: "unbalance", label: "Mất cân bằng pha", hint: "Mất cân bằng điện áp / dòng điện" },
  { id: "pst", label: "Pst/Plt", hint: "Nháy sáng điện áp" },
];

export const DEFAULT_CHART_METRICS: ChartMetricVisibility = {
  energy: true,
  ui: true,
  freq: true,
  power: true,
  harm: true,
  unbalance: true,
  pst: true,
};

export const DEFAULT_CHART_VISIBILITY: ChartVisibilitySettings = {
  project: DEFAULT_CHART_METRICS,
  meters: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeMetrics(value: unknown, fallback = DEFAULT_CHART_METRICS): ChartMetricVisibility {
  const source = isRecord(value) ? value : {};
  return CHART_METRICS.reduce((result, metric) => {
    const configured = source[metric.id];
    result[metric.id] = typeof configured === "boolean" ? configured : fallback[metric.id];
    return result;
  }, {} as ChartMetricVisibility);
}

export function normalizeChartVisibility(value: unknown): ChartVisibilitySettings {
  if (!isRecord(value)) return { project: { ...DEFAULT_CHART_METRICS }, meters: {} };

  const project = normalizeMetrics(value.project);
  const meters: Record<string, Partial<ChartMetricVisibility>> = {};
  if (isRecord(value.meters)) {
    for (const [meterId, raw] of Object.entries(value.meters)) {
      if (!isRecord(raw)) continue;
      const overrides: Partial<ChartMetricVisibility> = {};
      for (const metric of CHART_METRICS) {
        if (typeof raw[metric.id] === "boolean") overrides[metric.id] = raw[metric.id] as boolean;
      }
      if (Object.keys(overrides).length) meters[meterId] = overrides;
    }
  }
  return { project, meters };
}

export function chartMetricEnabled(
  settings: ChartVisibilitySettings,
  metric: ChartMetricId,
  meterIds: string[],
) {
  if (!meterIds.length) return settings.project[metric];
  return meterIds.every((meterId) => settings.meters[meterId]?.[metric] ?? settings.project[metric]);
}

