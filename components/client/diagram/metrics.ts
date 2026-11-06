import {
  METER_PARAMETERS,
  registerToKwh,
  type MeterParameter,
} from "@/lib/meter-parameters";
import type { MeterMetric, MeterStatus } from "./types";

/** Thông số mặc định trên thẻ sơ đồ (điện áp / dòng / công suất / tần số). */
export const DEFAULT_DIAGRAM_METRIC_KEYS = ["Van", "Ia", "Papt", "F"] as const;

/** Bỏ qua sóng hài bậc cao (quá dài cho picker sơ đồ). */
export const DIAGRAM_PICKER_PARAMETERS: MeterParameter[] = METER_PARAMETERS.filter(
  (item) => item.id <= 61,
);

const SHORT_LABELS: Record<string, string> = {
  Van: "Ua",
  Vbn: "Ub",
  Vcn: "Uc",
  Vab: "Uab",
  Vbc: "Ubc",
  Vca: "Uca",
  VLNavg: "Uavg",
  VLLavg: "Ull",
  Ia: "Ia",
  Ib: "Ib",
  Ic: "Ic",
  In: "In",
  Iavg: "Iavg",
  Papt: "P",
  Papa: "Pa",
  Papb: "Pb",
  Papc: "Pc",
  Qrpt: "Q",
  Sapt: "S",
  F: "f",
  PFt: "PF",
  EPaed: "E",
};

const ENERGY_KEYS = new Set(["EPaed", "EPaer", "EQred", "EQrer", "ESaed", "ESaer"]);

export const DIAGRAM_ONLINE_MS = 15 * 60 * 1000;

export function normalizeMetricKeys(keys: string[] | null | undefined): string[] {
  const cleaned = (keys ?? []).filter((key) => typeof key === "string" && key.trim());
  return cleaned.length ? [...new Set(cleaned)] : [...DEFAULT_DIAGRAM_METRIC_KEYS];
}

export function metricLabel(key: string) {
  return SHORT_LABELS[key] ?? key;
}

export function formatMetricReading(key: string, values: Record<string, number> | undefined) {
  const raw = values?.[key];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return "—";

  const param = METER_PARAMETERS.find((item) => item.key === key);
  let num = raw;
  let unit = param?.unit ?? "";

  if (ENERGY_KEYS.has(key)) {
    num = registerToKwh(raw);
    unit = "kWh";
  }

  const abs = Math.abs(num);
  const digits = abs >= 100 ? 1 : abs >= 10 ? 2 : abs >= 1 ? 2 : 3;
  const text = num.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: Number.isInteger(num) ? 0 : Math.min(digits, 1),
  });
  return unit ? `${text} ${unit}` : text;
}

export function buildLiveMetrics(
  keys: string[],
  values: Record<string, number> | undefined,
  options: {
    hasDevice: boolean;
    online: boolean;
    code: string;
  },
): { metrics: MeterMetric[]; status: MeterStatus; statusLabel?: string } {
  if (!options.hasDevice) {
    return {
      status: "offline",
      statusLabel: "CHƯA GÁN ĐỒNG HỒ",
      metrics: [
        { key: "status", label: "Trạng thái", value: "Chưa gán đồng hồ" },
        { key: "code", label: "Mã", value: options.code || "—" },
      ],
    };
  }

  const resolved = normalizeMetricKeys(keys);
  const hasAnyValue = resolved.some((key) => {
    const value = values?.[key];
    return typeof value === "number" && Number.isFinite(value);
  });

  if (!hasAnyValue) {
    return {
      status: "offline",
      statusLabel: "CHƯA CÓ DỮ LIỆU",
      metrics: [
        { key: "data", label: "Dữ liệu", value: "Chưa có bản tin" },
        { key: "code", label: "Mã", value: options.code || "—" },
      ],
    };
  }

  return {
    status: options.online ? "normal" : "warning",
    statusLabel: options.online ? undefined : "MẤT KẾT NỐI",
    metrics: resolved.map((key) => ({
      key,
      label: metricLabel(key),
      value: formatMetricReading(key, values),
    })),
  };
}

export function parameterGroups(params: MeterParameter[] = DIAGRAM_PICKER_PARAMETERS) {
  const groups = new Map<string, MeterParameter[]>();
  for (const param of params) {
    const list = groups.get(param.group) ?? [];
    list.push(param);
    groups.set(param.group, list);
  }
  return [...groups.entries()];
}
