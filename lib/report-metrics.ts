import {
  createTimeFilter,
  timeFilterSpan,
  type TimeFilterValue,
} from "@/components/client/TimeFilterBar";
import type { GatewayEnergySlot } from "@/lib/gateway-series";
import {
  civilWeekday,
  industrialBand,
  parseTariffPrice,
  resolveTouPrices,
  type TouBand,
  type TouPrices,
} from "@/lib/industrial-electricity";
import { registerToKwh } from "@/lib/meter-parameters";
import { vietnamFromStored } from "@/lib/vietnam-time";

export type ReportPeriod = "Ngày" | "Tuần" | "Tháng" | "Năm";

export type ReportRateConfig = {
  touPrices: TouPrices;
  flatPrices: Record<string, number>;
};

export type BandTotals = Record<TouBand, number>;

export type PointEnergyCost = {
  meterPointId: string;
  kwh: number;
  cost: number;
  kwhByBand: BandTotals;
  costByBand: BandTotals;
  /** Công suất trung bình đỉnh ước từ slot 30 phút (kW). */
  peakKw: number;
};

export type PeriodEnergyCost = {
  totalKwh: number;
  totalCost: number;
  peakKw: number;
  kwhByBand: BandTotals;
  costByBand: BandTotals;
  byPoint: PointEnergyCost[];
  byDay: { day: string; kwh: number; cost: number }[];
};

function emptyBand(): BandTotals {
  return { normal: 0, off: 0, peak: 0 };
}

function addBand(target: BandTotals, band: TouBand, value: number) {
  target[band] += value;
}

function slotStoredAt(day: string, hour: number, minute: number) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date, hour, minute) - 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19);
}

function formatCivilYmd(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shiftYmd(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return formatCivilYmd(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

/** Tuần lịch VN: Thứ Hai → Chủ nhật chứa dụng `date`. */
export function weekRangeContaining(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=CN
  const offsetFromMon = weekday === 0 ? 6 : weekday - 1;
  return {
    from: shiftYmd(date, -offsetFromMon),
    to: shiftYmd(date, -offsetFromMon + 6),
  };
}

export function reportTimeFilter(period: ReportPeriod, date: string): TimeFilterValue {
  const base = createTimeFilter();
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : base.date;
  const [y, m] = safe.split("-").map(Number);
  if (period === "Ngày") {
    return { ...base, mode: "day", date: safe, month: safe.slice(0, 7), year: y };
  }
  if (period === "Tuần") {
    const week = weekRangeContaining(safe);
    return {
      ...base,
      mode: "custom_date",
      customDateMode: "range",
      date: safe,
      month: safe.slice(0, 7),
      year: y,
      startDate: `${week.from}T00:00`,
      endDate: `${week.to}T23:59`,
    };
  }
  if (period === "Năm") {
    return { ...base, mode: "year", date: safe, month: safe.slice(0, 7), year: y };
  }
  return {
    ...base,
    mode: "month",
    date: safe,
    month: `${y}-${String(m).padStart(2, "0")}`,
    year: y,
  };
}

export function reportSpan(period: ReportPeriod, date: string) {
  return timeFilterSpan(reportTimeFilter(period, date));
}

/** Kỳ so sánh: lùi 1 ngày / 1 tuần / 1 tháng / 1 năm theo loại kỳ. */
export function compareAnchorDate(period: ReportPeriod, date: string) {
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : createTimeFilter().date;
  const [y, m, d] = safe.split("-").map(Number);
  if (period === "Ngày") return shiftYmd(safe, -1);
  if (period === "Tuần") return shiftYmd(safe, -7);
  if (period === "Năm") return formatCivilYmd(y - 1, m, d);
  const prev = new Date(Date.UTC(y, m - 2, Math.min(d, 28)));
  return formatCivilYmd(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate());
}

export function ratesFromCostConfig(costConfig: unknown): ReportRateConfig {
  const saved =
    costConfig && typeof costConfig === "object" && !Array.isArray(costConfig)
      ? (costConfig as {
          flatPrices?: Record<string, string>;
          electricity?: {
            voltageLevel?: string;
            prices?: Partial<Record<TouBand, unknown>>;
          };
        })
      : undefined;
  const tariff = resolveTouPrices(saved?.electricity?.voltageLevel, saved?.electricity?.prices);
  const flatPrices = Object.fromEntries(
    Object.entries(saved?.flatPrices ?? {}).map(([key, value]) => [key, parseTariffPrice(value)]),
  );
  return { touPrices: tariff.prices, flatPrices };
}

function priceForUtility(utility: string | undefined, rates: ReportRateConfig, band: TouBand) {
  if (!utility || utility === "Điện") return rates.touPrices[band];
  return rates.flatPrices[utility] ?? 0;
}

function bandForUtility(utility: string | undefined, parts: { year: number; month: number; day: number; hour: number; minute: number }) {
  if (!utility || utility === "Điện") {
    return industrialBand(civilWeekday(parts.year, parts.month, parts.day), parts.hour, parts.minute);
  }
  return "normal" as TouBand;
}

export function aggregatePeriodMetrics(
  slots: GatewayEnergySlot[],
  selectedPointIds: string[],
  utilityByPointId: Record<string, string>,
  rates: ReportRateConfig,
): PeriodEnergyCost {
  const selected = new Set(selectedPointIds);
  const byMeter = new Map<string, GatewayEnergySlot[]>();
  for (const slot of slots) {
    if (selected.size && !selected.has(slot.meterPointId)) continue;
    const list = byMeter.get(slot.meterPointId) ?? [];
    list.push(slot);
    byMeter.set(slot.meterPointId, list);
  }

  const byPoint: PointEnergyCost[] = [];
  const dayMap = new Map<string, { kwh: number; cost: number }>();
  const kwhByBand = emptyBand();
  const costByBand = emptyBand();
  let totalKwh = 0;
  let totalCost = 0;
  let peakKw = 0;

  for (const [meterPointId, list] of byMeter) {
    const ordered = [...list].sort(
      (a, b) => a.day.localeCompare(b.day) || a.hour - b.hour || a.minute - b.minute,
    );
    const pointKwhBand = emptyBand();
    const pointCostBand = emptyBand();
    let pointKwh = 0;
    let pointCost = 0;
    let pointPeak = 0;
    let previous: number | null = null;
    const utility = utilityByPointId[meterPointId] ?? "Điện";

    for (const slot of ordered) {
      const startKwh = registerToKwh(slot.firstWh);
      const endKwh = registerToKwh(slot.lastWh);
      const within = Math.max(0, endKwh - startKwh);
      const gap = previous == null ? 0 : Math.max(0, startKwh - previous);
      const delta = within + gap;
      previous = endKwh;
      if (delta <= 0) continue;

      const at = slotStoredAt(slot.day, slot.hour, slot.minute);
      const parts = vietnamFromStored(at);
      if (!parts) continue;
      const band = bandForUtility(utility, parts);
      const price = priceForUtility(utility, rates, band);
      const cost = delta * price;
      const slotKw = delta / 0.5;

      pointKwh += delta;
      pointCost += cost;
      pointPeak = Math.max(pointPeak, slotKw);
      addBand(pointKwhBand, band, delta);
      addBand(pointCostBand, band, cost);
      addBand(kwhByBand, band, delta);
      addBand(costByBand, band, cost);

      const dayRow = dayMap.get(slot.day) ?? { kwh: 0, cost: 0 };
      dayRow.kwh += delta;
      dayRow.cost += cost;
      dayMap.set(slot.day, dayRow);
    }

    totalKwh += pointKwh;
    totalCost += pointCost;
    peakKw = Math.max(peakKw, pointPeak);
    byPoint.push({
      meterPointId,
      kwh: pointKwh,
      cost: pointCost,
      kwhByBand: pointKwhBand,
      costByBand: pointCostBand,
      peakKw: pointPeak,
    });
  }

  return {
    totalKwh,
    totalCost,
    peakKw,
    kwhByBand,
    costByBand,
    byPoint,
    byDay: [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, row]) => ({ day, kwh: row.kwh, cost: row.cost })),
  };
}

export function formatReportKwh(value: number) {
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 3 })} kWh`;
}

export function formatReportVnd(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")} VNĐ`;
}

export function formatReportKw(value: number) {
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 3 })} kW`;
}

export function formatSignedDelta(current: number, previous: number, kind: "kwh" | "vnd") {
  const delta = current - previous;
  const sign = delta > 0 ? "+" : "";
  if (kind === "kwh") return `${sign}${delta.toLocaleString("vi-VN", { maximumFractionDigits: 3 })} kWh`;
  return `${sign}${Math.round(delta).toLocaleString("vi-VN")} VNĐ`;
}

export function bandLabel(band: TouBand) {
  if (band === "off") return "Thấp điểm (TD)";
  if (band === "peak") return "Cao điểm (CD)";
  return "Bình thường (BT)";
}
