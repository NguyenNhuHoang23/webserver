"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_TIME_FILTER,
  TimeFilterBar,
  getTimeFilterLabel,
  getTimeFilterPeriods,
  type TimeFilterValue,
} from "@/components/client/TimeFilterBar";
import { FrequencyChart } from "@/components/client/FrequencyChart";
import { HarmonicsChart } from "@/components/client/HarmonicsChart";
import { PowerChart } from "@/components/client/PowerChart";
import { UiWaveform, type UiWaveformPreferences } from "@/components/client/UiWaveform";
import { UnbalanceChart } from "@/components/client/UnbalanceChart";
import { hydrateClientMeters, loadClientMeters, orderMetersByTree } from "@/lib/client-meters";
import { hydrateProjects, loadProjects, resolveMeterTypes } from "@/lib/projects";
import { hydrateMeterReadings, type MeterReading } from "@/lib/meter-readings";
import { hydrateProjectSettings, saveProjectSettings } from "@/lib/project-settings";

type EnergyKind = string;
type MetricId = "energy" | "ui" | "freq" | "power" | "harm" | "unbalance" | "pst";
type ViewMode = "chart" | "table";

type MeterPoint = {
  id: string;
  code: string;
  name: string;
  energy: EnergyKind;
  color: string;
};

const POINT_COLORS = ["#059669", "#22c55e", "#a16207", "#ef4444", "#8b5cf6", "#06b6d4", "#f59e0b"];

const FALLBACK_POINTS: MeterPoint[] = [
  { id: "p1", code: "DB-OFF1", name: "Tủ điện văn phòng", energy: "Điện", color: POINT_COLORS[0] },
  { id: "p2", code: "DB-PROD", name: "Dây chuyền sản xuất A", energy: "Điện", color: POINT_COLORS[1] },
  { id: "p3", code: "DB-HVAC", name: "Hệ thống HVAC", energy: "Điện", color: POINT_COLORS[2] },
  { id: "p4", code: "DB-MAIN", name: "Nguồn tổng nhà máy", energy: "Điện", color: POINT_COLORS[3] },
  { id: "p5", code: "AIR-01", name: "Máy nén khí trạm 1", energy: "Khí nén", color: POINT_COLORS[0] },
  { id: "p6", code: "AIR-02", name: "Máy nén khí trạm 2", energy: "Khí nén", color: POINT_COLORS[1] },
  { id: "p7", code: "WTR-01", name: "Đồng hồ nước đầu nguồn", energy: "Nước", color: POINT_COLORS[0] },
  { id: "p8", code: "WTR-02", name: "Hệ thống làm mát", energy: "Nước", color: POINT_COLORS[1] },
  { id: "p9", code: "HT-01", name: "Cảm biến nhiệt dàn", energy: "Nhiệt", color: POINT_COLORS[0] },
  { id: "p10", code: "STM-01", name: "Nồi hơi công nghệ", energy: "Hơi", color: POINT_COLORS[0] },
];

const ENERGY_KIND_META: Record<string, "bolt" | "heat" | "air" | "water" | "steam"> = {
  Điện: "bolt",
  Nhiệt: "heat",
  "Khí nén": "air",
  Nước: "water",
  Hơi: "steam",
};

const METRICS: { id: MetricId; label: string }[] = [
  { id: "energy", label: "Energy" },
  { id: "ui", label: "U / I" },
  { id: "freq", label: "Tần số" },
  { id: "power", label: "Công suất" },
  { id: "harm", label: "Sóng hài" },
  { id: "unbalance", label: "Mất cân bằng pha" },
  { id: "pst", label: "Pst/Plt" },
];

type BarPoint = { minute: number; label: string; kwh: number };

type ChartPreferences = {
  energy: EnergyKind;
  metric: MetricId;
  selectedIds: string[];
  timeFilter: TimeFilterValue;
  ui: UiWaveformPreferences;
};

const DEFAULT_UI_PREFERENCES: UiWaveformPreferences = {
  uQty: "U",
  iQty: "I",
  uCh: [1, 2, 3],
  iCh: [1, 2, 3],
};

function isMetricId(value: unknown): value is MetricId {
  return METRICS.some((item) => item.id === value);
}

function energyBarsForFilter(seed: number, filter: TimeFilterValue): BarPoint[] {
  const periods = getTimeFilterPeriods(filter);
  const count = Math.max(periods.length, 1);
  return periods.map((p, i) => {
    const isHourly =
      filter.mode === "day" ||
      (filter.mode === "custom_date" && filter.customDateMode !== "range");
    let baseKwh = 95;
    if (isHourly) {
      const hour = Number(p.key);
      const isWorkHour = hour >= 7 && hour <= 18;
      baseKwh = isWorkHour ? 150 + 40 * Math.sin(hour * 0.4) : 40 + 15 * Math.sin(hour);
    } else if (filter.mode === "year") {
      baseKwh = 2400 + 450 * Math.sin(i * 0.55 + seed);
    } else {
      const weekend = (i + Math.floor(seed)) % 7 >= 5;
      baseKwh = 95 + 50 * Math.sin(i * 0.45 + seed) + (weekend ? -25 : 18);
    }
    const noise = Math.sin(i * 0.9 + seed * 0.7) * (isHourly ? 8 : 20);
    const kwh = Math.max(10, baseKwh + noise);
    return {
      minute: i,
      label: p.label,
      kwh: Number(kwh.toFixed(1)),
    };
  });
}

function energyBarsFromReadings(
  seed: number,
  filter: TimeFilterValue,
  pointId: string | undefined,
  readings: MeterReading[],
) {
  const rows = readings.filter((row) => row.meterPointId === pointId && row.metric === "energy");
  if (!rows.length) return energyBarsForFilter(seed, filter);
  const periods = getTimeFilterPeriods(filter);
  const values = new Map<number, number>();
  for (const row of rows) {
    const date = row.recordedAt.slice(0, 10);
    let index = -1;
    if (filter.mode === "month") {
      if (date.slice(0, 7) === filter.month) index = Number(date.slice(8, 10)) - 1;
    } else if (filter.mode === "year") {
      if (Number(date.slice(0, 4)) === filter.year) index = Number(date.slice(5, 7)) - 1;
    } else if (filter.mode === "day" && date === filter.date) {
      index = Number(row.recordedAt.slice(11, 13));
    } else if (
      filter.mode === "custom_date" &&
      filter.customDateMode !== "range" &&
      date === filter.customDate
    ) {
      index = Number(row.recordedAt.slice(11, 13));
    } else if (filter.mode === "custom_date" && filter.customDateMode === "range") {
      const start = new Date(`${filter.startDate}T00:00:00`).getTime();
      const current = new Date(`${date}T00:00:00`).getTime();
      index = Math.round((current - start) / (24 * 60 * 60 * 1000));
    }
    if (index >= 0 && index < periods.length) values.set(index, (values.get(index) ?? 0) + row.value);
  }
  if (!values.size) return energyBarsForFilter(seed, filter);
  return periods.map((period, index) => ({
    minute: index,
    label: period.label,
    kwh: Number((values.get(index) ?? 0).toFixed(1)),
  }));
}

function formatNum(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function seriesFor(metric: MetricId, seed: number, count: number): number[][] {
  const wave = (base: number, amp: number, shift: number, n: number) =>
    Array.from({ length: 25 }, (_, h) => {
      const t = (h + shift) / 24;
      return (
        base +
        amp * Math.sin(t * Math.PI * 2) +
        amp * 0.35 * Math.sin(t * Math.PI * 4 + n) +
        (h > 8 && h < 15 ? amp * 0.25 : 0) -
        (h < 5 ? amp * 0.2 : 0)
      );
    });

  return Array.from({ length: Math.max(count, 1) }, (_, i) => {
    const n = seed + i;
    if (metric === "freq") return wave(50.02 - i * 0.01, 0.08, i, n);
    if (metric === "ui") return wave(398 + i * 2, 12 - i, i * 0.8, n);
    if (metric === "power") return wave(180 - i * 20, 55 - i * 5, i, n);
    return wave(165 - i * 15, 52, i * 1.1, n);
  });
}

function metricMeta(energy: EnergyKind, metric: MetricId) {
  if (energy !== "Điện") {
    return {
      title: `Chi tiết tiêu thụ ${energy.toLowerCase()}`,
      unit: energy === "Nước" ? "M³" : energy === "Nhiệt" ? "KWH NHIỆT" : "M³ KHÍ NÉN",
    };
  }
  const map: Record<MetricId, { title: string; unit: string }> = {
    energy: { title: "Chi tiết tiêu thụ điện năng", unit: "KILOWATT-GIỜ (KWH)" },
    ui: { title: "Điện áp / Dòng điện", unit: "VOLT (V)" },
    freq: { title: "Tần số lưới điện", unit: "HERTZ (HZ)" },
    power: { title: "Công suất tức thời", unit: "KILOWATT (KW)" },
    harm: { title: "Sóng hài (THD)", unit: "PHẦN TRĂM (%)" },
    unbalance: { title: "Mất cân bằng pha", unit: "PHẦN TRĂM (%)" },
    pst: { title: "Nháy sáng Pst/Plt", unit: "CHỈ SỐ PST" },
  };
  return map[metric];
}

export function EnergyCharts() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "default";
  const [energyKinds, setEnergyKinds] = useState<EnergyKind[]>(["Điện", "Nước", "Nhiệt", "Hơi"]);
  const [energy, setEnergy] = useState<EnergyKind>("Điện");
  const [metric, setMetric] = useState<MetricId>("energy");
  const [view, setView] = useState<ViewMode>("chart");
  const [seed, setSeed] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState<number | null>(null);
  const [showSum, setShowSum] = useState(false);
  const [range, setRange] = useState({ start: 0, end: 30 });
  const [allPoints, setAllPoints] = useState<MeterPoint[]>(FALLBACK_POINTS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preferredPointIds, setPreferredPointIds] = useState<string[] | undefined>(undefined);
  const [pointQuery, setPointQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>(DEFAULT_TIME_FILTER);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [uiPreferences, setUiPreferences] = useState<UiWaveformPreferences>(DEFAULT_UI_PREFERENCES);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    let active = true;
    const reload = () => {
      void Promise.all([
        hydrateProjects(),
        hydrateClientMeters(projectId),
        hydrateMeterReadings(projectId),
        hydrateProjectSettings(projectId),
      ]).then(([projects, meterRows, readingRows, settings]) => {
        if (!active) return;
        setReadings(readingRows);
        const rawPreferences = settings.chartPreferences;
        if (rawPreferences && typeof rawPreferences === "object" && !Array.isArray(rawPreferences)) {
          const preferences = rawPreferences as Partial<ChartPreferences>;
          if (typeof preferences.energy === "string") setEnergy(preferences.energy);
          if (isMetricId(preferences.metric)) setMetric(preferences.metric);
          if (Array.isArray(preferences.selectedIds)) {
            setPreferredPointIds(preferences.selectedIds.filter((id): id is string => typeof id === "string"));
          } else {
            setPreferredPointIds(undefined);
          }
          if (preferences.timeFilter && typeof preferences.timeFilter === "object") {
            setTimeFilter({
              ...DEFAULT_TIME_FILTER,
              ...(preferences.timeFilter as Partial<TimeFilterValue>),
            });
          }
          if (preferences.ui && typeof preferences.ui === "object") {
            const ui = preferences.ui as Partial<UiWaveformPreferences>;
            setUiPreferences({
              ...DEFAULT_UI_PREFERENCES,
              ...ui,
              uCh: Array.isArray(ui.uCh) ? ui.uCh.filter((ch): ch is number => typeof ch === "number") : DEFAULT_UI_PREFERENCES.uCh,
              iCh: Array.isArray(ui.iCh) ? ui.iCh.filter((ch): ch is number => typeof ch === "number") : DEFAULT_UI_PREFERENCES.iCh,
            });
          }
        } else {
          setPreferredPointIds(undefined);
          setUiPreferences(DEFAULT_UI_PREFERENCES);
        }
        const project = projects.find((item) => item.id === projectId);
        const types = resolveMeterTypes(project);
        setEnergyKinds(types);
        setEnergy((current) => (types.includes(current) ? current : types[0] ?? "Điện"));
        const meters = orderMetersByTree(meterRows.length ? meterRows : loadClientMeters(projectId));
        if (!meters.length) {
          setAllPoints(FALLBACK_POINTS);
          return;
        }
        setAllPoints(
          meters.map((meter, index) => ({
            id: meter.id,
            code: meter.code,
            name: meter.name,
            energy: meter.utility,
            color: POINT_COLORS[index % POINT_COLORS.length],
          })),
        );
      });
    };
    reload();
    window.addEventListener("ems-client-meters-changed", reload);
    return () => {
      active = false;
      window.removeEventListener("ems-client-meters-changed", reload);
    };
  }, [projectId]);

  const pointsForEnergy = useMemo(
    () => allPoints.filter((p) => p.energy === energy),
    [allPoints, energy],
  );

  const filteredPoints = useMemo(() => {
    const q = pointQuery.trim().toLowerCase();
    if (!q) return pointsForEnergy;
    return pointsForEnergy.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );
  }, [pointQuery, pointsForEnergy]);

  // Khi đổi loại năng lượng, giữ các điểm đã chọn thuộc loại đó; nếu trống thì chọn 1–2 điểm đầu
  useEffect(() => {
    setSelectedIds((current) => {
      if (preferredPointIds !== undefined) {
        const preferred = preferredPointIds.filter((id) => pointsForEnergy.some((p) => p.id === id));
        if (preferred.length > 0 || preferredPointIds.length === 0) return preferred;
      }
      const kept = current.filter((id) => pointsForEnergy.some((p) => p.id === id));
      if (kept.length > 0) return kept;
      return pointsForEnergy.slice(0, Math.min(2, pointsForEnergy.length)).map((p) => p.id);
    });
  }, [pointsForEnergy, preferredPointIds]);

  const selectedPoints = useMemo(
    () => pointsForEnergy.filter((p) => selectedIds.includes(p.id)),
    [pointsForEnergy, selectedIds],
  );

  const values = useMemo(
    () => seriesFor(metric, seed, Math.max(selectedPoints.length, 1)),
    [metric, seed, selectedPoints.length],
  );

  const multiBars = useMemo(
    () =>
      selectedPoints.map((point, i) => ({
        point,
        bars: energyBarsFromReadings(seed + i * 1.7, timeFilter, point.id, readings),
      })),
    [readings, selectedPoints, seed, timeFilter],
  );

  const barCount = multiBars[0]?.bars.length ?? 30;

  useEffect(() => {
    setRange({ start: 0, end: Math.max(barCount - 1, 0) });
  }, [timeFilter, barCount]);

  const isElectric = energy === "Điện";
  /** Tiêu thụ năng lượng/hạ tầng — áp dụng mọi loại (Điện, Nước, …) */
  const isConsumptionChart = metric === "energy";
  const isEnergyChart = isElectric && isConsumptionChart;
  const isUiChart = isElectric && metric === "ui";
  const isFreqChart = isElectric && metric === "freq";
  const isPowerChart = isElectric && metric === "power";
  const isHarmChart = isElectric && metric === "harm";
  const isUnbChart = isElectric && metric === "unbalance";
  const meta = metricMeta(energy, isElectric ? metric : "energy");
  const yMax = isConsumptionChart ? 7 : Math.max(...values.flat(), 1) * 1.08;
  const yMin = isConsumptionChart ? 0 : Math.min(0, Math.min(...values.flat()) * 0.92);

  // Rời tab Điện → luôn về chế độ tiêu thụ, không giữ Pst/U-I/…
  useEffect(() => {
    if (!isElectric && metric !== "energy") {
      setMetric("energy");
    }
  }, [isElectric, metric]);

  const consumptionUnit =
    energy === "Nước"
      ? "m³"
      : energy === "Khí nén"
        ? "Nm³"
        : energy === "Hơi"
          ? "t"
          : energy === "Nhiệt"
            ? "kWh"
            : "kWh";

  const primaryBars = multiBars[0]?.bars ?? energyBarsFromReadings(seed, timeFilter, selectedPoints[0]?.id, readings);
  const visibleBars = primaryBars.slice(range.start, range.end + 1);
  const barSum = multiBars.reduce(
    (sum, series) =>
      sum + series.bars.slice(range.start, range.end + 1).reduce((s, p) => s + p.kwh, 0),
    0,
  );

  const pointTotals = useMemo(
    () =>
      multiBars.map((item) => ({
        point: item.point,
        total: item.bars.reduce((s, p) => s + p.kwh, 0),
      })),
    [multiBars],
  );

  const grandTotal = pointTotals.reduce((s, item) => s + item.total, 0);

  const tou = useMemo(() => {
    const peak = Math.round(grandTotal * 0.18 * 10) / 10;
    const normal = Math.round(grandTotal * 0.61 * 10) / 10;
    const off = Math.round(grandTotal * 0.16 * 10) / 10;
    const none = Math.max(0, Math.round((grandTotal - peak - normal - off) * 10) / 10);
    return { peak, normal, off, none };
  }, [grandTotal]);

  const totals = useMemo(() => {
    if (isConsumptionChart) {
      return {
        kind: "energy" as const,
        total: formatNum(grandTotal),
        count: selectedPoints.length,
      };
    }
    const flat = values.flat();
    if (flat.length === 0) {
      return { kind: "stats" as const, min: "--", max: "--", avg: "--", count: selectedPoints.length };
    }
    const min = Math.min(...flat);
    const max = Math.max(...flat);
    const avg = flat.reduce((a, b) => a + b, 0) / flat.length;
    return {
      kind: "stats" as const,
      min: min.toFixed(2),
      max: max.toFixed(2),
      avg: avg.toFixed(2),
      count: selectedPoints.length,
    };
  }, [grandTotal, values, isConsumptionChart, selectedPoints.length]);

  const statsUnit =
    metric === "pst"
      ? "Pst"
      : metric === "freq"
        ? "Hz"
        : metric === "ui"
          ? "V"
          : metric === "power"
            ? "kW"
            : metric === "harm" || metric === "unbalance"
              ? "%"
              : "";

  function togglePoint(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }
      return [...current, id];
    });
  }

  function selectAllVisible() {
    setSelectedIds(filteredPoints.map((p) => p.id));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  async function saveChartDefaults() {
    setSaveState("saving");
    try {
      const current = await hydrateProjectSettings(projectId);
      const chartPreferences: ChartPreferences = {
        energy,
        metric,
        selectedIds,
        timeFilter,
        ui: uiPreferences,
      };
      await saveProjectSettings(projectId, {
        ...current,
        chartPreferences,
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div className="flex h-full min-h-0 bg-[#f4f6f9]">
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Điểm đo trên sơ đồ</h2>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
            Tick chọn vị trí điểm đo (cùng danh sách Cấu hình / Sơ đồ) để hiển thị trên biểu đồ
          </p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-slate-400">
            DANH SÁCH ĐIỂM ĐO · {energy.toUpperCase()}
          </p>
          <label className="relative mb-2 block">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
              <SearchIcon className="h-3.5 w-3.5" />
            </span>
            <input
              value={pointQuery}
              onChange={(e) => setPointQuery(e.target.value)}
              placeholder="Tìm điểm đo..."
              className="h-9 w-full rounded-md border border-slate-200 bg-white pr-3 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500"
            />
          </label>
          <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>
              Đã chọn {selectedPoints.length}/{filteredPoints.length}
            </span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllVisible}
                className="font-medium text-emerald-600 hover:underline"
              >
                Chọn tất cả
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="font-medium text-slate-500 hover:underline"
              >
                Bỏ chọn
              </button>
            </span>
          </div>
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {filteredPoints.length === 0 ? (
              <li className="py-8 text-center text-sm text-slate-400">
                Không có điểm đo loại {energy}. Thêm tại Cấu hình → Cụm điểm đo.
              </li>
            ) : (
              filteredPoints.map((point, index) => {
                const checked = selectedIds.includes(point.id);
                return (
                  <li key={point.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors ${
                        checked
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePoint(point.id)}
                        className="h-4 w-4 shrink-0 rounded border border-white/40 bg-white accent-emerald-600"
                      />
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px] ring-1 ring-black/10"
                        style={{ backgroundColor: point.color }}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-[13px] font-medium ${
                            checked ? "text-white" : "text-slate-700"
                          }`}
                        >
                          {index + 1}. {point.name}
                        </span>
                        <span
                          className={`block truncate text-[11px] ${
                            checked ? "text-white/75" : "text-slate-400"
                          }`}
                        >
                          ({point.code})
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {energyKinds.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setEnergy(item);
                    setMetric("energy");
                  }}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium transition-colors ${
                    energy === item
                      ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <EnergyGlyph type={ENERGY_KIND_META[item] ?? "bolt"} className="h-3.5 w-3.5" />
                  {item}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={saveChartDefaults}
                disabled={saveState === "saving"}
                className={`inline-flex h-8 items-center rounded-md border px-2.5 text-[12px] font-semibold transition-colors ${
                  saveState === "saved"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : saveState === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                {saveState === "saving"
                  ? "Đang lưu..."
                  : saveState === "saved"
                    ? "Đã lưu mặc định"
                    : saveState === "error"
                      ? "Lưu thất bại"
                      : "Lưu mặc định"}
              </button>
              <TimeFilterBar value={timeFilter} onChange={setTimeFilter} />
            </div>
          </div>
          {isElectric ? (
            <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-100 pt-2">
              {METRICS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMetric(item.id)}
                  className={`h-7 rounded-full px-2.5 text-[11.5px] font-medium transition-colors ${
                    metric === item.id
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2 sm:p-3">
        {isUiChart ? (
          <section className="rounded-lg border border-slate-200 bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-3">
            <UiWaveform
              timeFilter={timeFilter}
              preferences={uiPreferences}
              onPreferencesChange={setUiPreferences}
            />
          </section>
        ) : isFreqChart ? (
          <FrequencyChart seed={seed} timeFilter={timeFilter} onRefresh={() => setSeed((n) => n + 1)} />
        ) : isPowerChart ? (
          <PowerChart seed={seed} timeFilter={timeFilter} />
        ) : isHarmChart ? (
          <HarmonicsChart seed={seed} />
        ) : isUnbChart ? (
          <UnbalanceChart seed={seed} />
        ) : isConsumptionChart ? (
          <>
            <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
              <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[15px] font-semibold text-slate-800">
                      {energy === "Điện"
                        ? "Chi tiết tiêu thụ điện năng"
                        : `Chi tiết tiêu thụ ${energy.toLowerCase()}`}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-600">
                      {selectedPoints.length === 0 ? (
                        <span className="text-slate-400">Chọn điểm đo bên trái để hiển thị</span>
                      ) : (
                        selectedPoints.map((point) => (
                          <span key={point.id} className="inline-flex items-center gap-1.5">
                            <span
                              className="h-2.5 w-2.5 rounded-[2px]"
                              style={{ backgroundColor: point.color }}
                            />
                            ({point.code}) {point.name}
                          </span>
                        ))
                      )}
                      {showSum && selectedPoints.length > 0 ? (
                        <span className="font-semibold text-emerald-600">
                          Σ {formatNum(barSum)} {consumptionUnit}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <IconBtn
                      label="Biểu đồ cột"
                      active={view === "chart"}
                      onClick={() => setView("chart")}
                    >
                      <BarIcon className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label="Tổng" active={showSum} onClick={() => setShowSum((v) => !v)}>
                      <SigmaIcon className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn
                      label="Bảng dữ liệu"
                      active={view === "table"}
                      onClick={() => setView("table")}
                    >
                      <TableIcon className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label="Làm mới" onClick={() => setSeed((n) => n + 1)}>
                      <RefreshIcon className="h-4 w-4" />
                    </IconBtn>
                  </div>
                </div>

                {selectedPoints.length === 0 ? (
                  <p className="py-16 text-center text-sm text-slate-400">
                    Tick chọn điểm đo bên trái để xem tiêu thụ
                  </p>
                ) : view === "chart" ? (
                  <MultiConsumptionBarChart
                    series={multiBars}
                    range={range}
                    onRange={setRange}
                    hover={hover}
                    onHover={setHover}
                    unit={consumptionUnit}
                    yMaxHint={260}
                  />
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] text-slate-400">
                          <th className="py-2 font-medium">Thời điểm</th>
                          {selectedPoints.map((p) => (
                            <th key={p.id} className="py-2 font-medium" style={{ color: p.color }}>
                              ({p.code}) {p.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleBars.map((point, rowIdx) => (
                          <tr key={point.minute} className="border-b border-slate-50 text-slate-600">
                            <td className="py-1.5 font-medium">{point.label}</td>
                            {multiBars.map((series) => (
                              <td key={series.point.id} className="py-1.5">
                                {series.bars[range.start + rowIdx]?.kwh.toFixed(1)} {consumptionUnit}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>

              <div className="flex min-h-0 flex-col gap-4">
                <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <h2 className="text-center text-[13px] font-bold tracking-wide text-slate-700">
                    TỔNG HỢP TIÊU THỤ THEO ĐIỂM ĐO
                  </h2>
                  <ConsumptionDonut
                    value={grandTotal}
                    unit={consumptionUnit}
                    segments={pointTotals}
                  />
                  <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto">
                    {pointTotals.map((item) => {
                      const pct = grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0;
                      return (
                        <div
                          key={item.point.id}
                          className="rounded-md bg-[#eaf3fb] px-3 py-2 text-[12px] text-slate-700"
                        >
                          <p className="flex items-start gap-2">
                            <span
                              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: item.point.color }}
                            />
                            <span>
                              ({item.point.code}) {item.point.name}
                              <span className="mt-0.5 block font-semibold">
                                {formatNum(item.total)} {consumptionUnit} (~{pct}%)
                              </span>
                            </span>
                          </p>
                        </div>
                      );
                    })}
                    {pointTotals.length === 0 ? (
                      <p className="py-4 text-center text-[12px] text-slate-400">Chưa chọn điểm đo</p>
                    ) : null}
                  </div>
                </article>

                {isElectric ? (
                  <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                    <h2 className="text-center text-[13px] font-bold tracking-wide text-slate-700">
                      TỔNG HỢP TIÊU THỤ THEO KHUNG GIỜ
                    </h2>
                    <TouConsumptionChart values={tou} />
                    <p className="mt-1 text-right text-[11px] text-slate-400">({consumptionUnit})</p>
                  </article>
                ) : null}
              </div>
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
              <div className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs">
                <span className="text-slate-400 font-normal">Kỳ lọc:</span>
                <span className="text-slate-900">{getTimeFilterLabel(timeFilter)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-500">
                <p className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Hệ thống đang hoạt động bình thường
                </p>
                <p>Cập nhật: 2026-07-19 10:04:46</p>
              </div>
            </div>
          </>
        ) : (
          <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-4">
            <div className="relative">
              <h1 className="text-center text-[15px] font-semibold text-slate-800 sm:text-[16px]">
                {meta.title}
              </h1>
              <div className="absolute top-0 right-0 flex items-center gap-0.5">
                <IconBtn label="Biểu đồ" active={view === "chart"} onClick={() => setView("chart")}>
                  <BarIcon className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="Tổng" active={showSum} onClick={() => setShowSum((v) => !v)}>
                  <SigmaIcon className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="Bảng dữ liệu" active={view === "table"} onClick={() => setView("table")}>
                  <TableIcon className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="Làm mới" onClick={() => setSeed((n) => n + 1)}>
                  <RefreshIcon className="h-4 w-4" />
                </IconBtn>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-slate-600">
              {selectedPoints.length === 0 ? (
                <span className="text-slate-400">Chọn điểm đo bên trái để hiển thị</span>
              ) : (
                selectedPoints.map((point) => (
                  <span key={point.id} className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-[2px]"
                      style={{ backgroundColor: point.color }}
                    />
                    ({point.code}) {point.name}
                  </span>
                ))
              )}
            </div>

            {view === "chart" ? (
              <div className="relative mt-2">
                <LineChart
                  values={values}
                  colors={selectedPoints.map((p) => p.color)}
                  names={selectedPoints.map((p) => p.name)}
                  yMin={yMin}
                  yMax={yMax}
                  zoom={zoom}
                  hover={hover}
                  onHover={setHover}
                />
                <div className="absolute top-3 right-1 flex flex-col gap-1">
                  <IconBtn label="Phóng to" onClick={() => setZoom((z) => Math.min(3, z + 0.35))}>
                    +
                  </IconBtn>
                  <IconBtn label="Thu nhỏ" onClick={() => setZoom((z) => Math.max(1, z - 0.35))}>
                    −
                  </IconBtn>
                  <IconBtn label="Về mặc định" onClick={() => setZoom(1)}>
                    <HomeIcon className="h-4 w-4" />
                  </IconBtn>
                </div>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] text-slate-400">
                      <th className="py-2 font-medium">Thời điểm</th>
                      {selectedPoints.map((p) => (
                        <th key={p.id} className="py-2 font-medium" style={{ color: p.color }}>
                          ({p.code}) {p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 25 }, (_, i) => (
                      <tr key={i} className="border-b border-slate-50 text-slate-600">
                        <td className="py-1.5">{String(i).padStart(2, "0")}:00</td>
                        {values.map((row, s) => (
                          <td key={selectedPoints[s]?.id ?? s} className="py-1.5">
                            {row[i].toFixed(1)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {isElectric && totals.kind === "stats" ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <StatCard
                  label={`GIÁ TRỊ NHỎ NHẤT (${totals.count} ĐIỂM)`}
                  value={totals.min}
                  unit={statsUnit}
                  color="text-emerald-600"
                />
                <StatCard
                  label={`GIÁ TRỊ LỚN NHẤT (${totals.count} ĐIỂM)`}
                  value={totals.max}
                  unit={statsUnit}
                  color="text-red-500"
                />
                <StatCard
                  label={`GIÁ TRỊ TRUNG BÌNH (${totals.count} ĐIỂM)`}
                  value={totals.avg}
                  unit={statsUnit}
                  color="text-emerald-600"
                />
              </div>
            ) : null}
          </section>
        )}

        {!isUiChart &&
        !isFreqChart &&
        !isPowerChart &&
        !isHarmChart &&
        !isUnbChart &&
        !isConsumptionChart ? null : isConsumptionChart ? null : (
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4 text-[12px] text-slate-500">
            <p className="flex items-center gap-3">
              <span className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-bold tracking-wide text-emerald-700">
                HỆ THỐNG: BÌNH THƯỜNG
              </span>
              <span>Cập nhật: 2026-07-19 10:04:46</span>
            </p>
            <p className="inline-flex items-center gap-1.5 font-medium text-slate-400">
              <ShieldIcon className="h-4 w-4" />
              DỮ LIỆU BẢO MẬT
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function MultiConsumptionBarChart({
  series,
  range,
  onRange,
  hover,
  onHover,
  unit = "kWh",
  yMaxHint = 260,
}: {
  series: { point: MeterPoint; bars: BarPoint[] }[];
  range: { start: number; end: number };
  onRange: (range: { start: number; end: number }) => void;
  hover: number | null;
  onHover: (index: number | null) => void;
  unit?: string;
  yMaxHint?: number;
}) {
  const W = 980;
  const H = 360;
  const pad = { l: 48, r: 16, t: 28, b: 32 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const base = series[0]?.bars ?? [];
  const visibleLen = Math.max(range.end - range.start + 1, 1);
  const dataMax = Math.max(
    ...series.flatMap((s) => s.bars.slice(range.start, range.end + 1).map((b) => b.kwh)),
    1,
  );
  const yMax = Math.max(yMaxHint, Math.ceil(dataMax / 50) * 50);
  const yAt = (v: number) => pad.t + ((yMax - v) / yMax) * innerH;
  const groupW = innerW / visibleLen;
  const barCount = Math.max(series.length, 1);
  const barW = groupW / (barCount + 0.6);
  const tickStep = yMax <= 100 ? 20 : yMax <= 300 ? 50 : 100;
  const yTicks = Array.from({ length: Math.floor(yMax / tickStep) + 1 }, (_, i) => i * tickStep);

  return (
    <div className="mt-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[320px] w-full sm:h-[360px]"
        onMouseLeave={() => onHover(null)}
      >
        <text x={pad.l} y="16" className="fill-slate-400" fontSize="12">
          ({unit})
        </text>
        {yTicks.map((v) => {
          const y = yAt(v);
          return (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#eceff3" />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" className="fill-slate-400" fontSize="11">
                {v}
              </text>
            </g>
          );
        })}
        {Array.from({ length: visibleLen }, (_, i) => {
          const globalIndex = range.start + i;
          return series.map((item, sIdx) => {
            const point = item.bars[globalIndex];
            if (!point) return null;
            const x = pad.l + i * groupW + groupW * 0.15 + sIdx * barW;
            const h = Math.max(0, yAt(0) - yAt(point.kwh));
            return (
              <rect
                key={`${item.point.id}-${point.minute}`}
                x={x}
                y={yAt(point.kwh)}
                width={Math.max(2, barW * 0.85)}
                height={h}
                fill={item.point.color}
                opacity={hover == null || hover === globalIndex ? 1 : 0.4}
                onMouseEnter={() => onHover(globalIndex)}
              />
            );
          });
        })}
        {Array.from({ length: visibleLen }, (_, i) => {
          const globalIndex = range.start + i;
          const point = base[globalIndex];
          if (!point) return null;
          const show =
            visibleLen <= 16 ||
            Number(point.label) % 2 === 1 ||
            Number(point.label) === 1 ||
            globalIndex === range.end;
          if (!show) return null;
          return (
            <text
              key={`lbl-${point.minute}`}
              x={pad.l + i * groupW + groupW / 2}
              y={H - 10}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize="11"
            >
              {point.label}
            </text>
          );
        })}
        {hover != null && base[hover] ? (
          <g transform={`translate(${Math.min(pad.l + (hover - range.start) * groupW + 12, W - 180)}, ${pad.t + 6})`}>
            <rect width="168" height={20 + series.length * 16} rx="4" fill="white" stroke="#e2e8f0" />
            <text x="10" y="16" className="fill-slate-500 font-semibold" fontSize="11">
              {base[hover].label}
            </text>
            {series.map((item, i) => (
              <text
                key={item.point.id}
                x="10"
                y={34 + i * 16}
                fontSize="11"
                fontWeight="600"
                fill={item.point.color}
              >
                {item.point.code}: {item.bars[hover]?.kwh.toFixed(1)} {unit}
              </text>
            ))}
          </g>
        ) : null}
      </svg>
      <DataZoom
        points={base}
        range={range}
        onRange={onRange}
      />
    </div>
  );
}

function ConsumptionDonut({
  value,
  unit,
  segments,
}: {
  value: number;
  unit: string;
  segments: { point: MeterPoint; total: number }[];
}) {
  const r = 58;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative mx-auto my-3 h-[168px] w-[168px]">
      <svg viewBox="0 0 160 160" className="h-full w-full">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#e8eef4" strokeWidth="22" />
        {segments.map((item) => {
          const portion = value > 0 ? item.total / value : 0;
          const dash = portion * c;
          const el = (
            <circle
              key={item.point.id}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={item.point.color}
              strokeWidth="22"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 80 80)"
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
        <p className="text-[20px] font-bold leading-none text-slate-800">{formatNum(value)}</p>
        <p className="mt-1 text-[12px] text-slate-500">{unit}</p>
      </div>
    </div>
  );
}

const TOU_COLORS = [
  { id: "peak", label: "Cao", color: "#e67e22" },
  { id: "normal", label: "Trung", color: "#27ae60" },
  { id: "off", label: "Thấp", color: "#7ec8e3" },
  { id: "none", label: "Không", color: "#9aa3af" },
] as const;

function TouConsumptionChart({
  values,
}: {
  values: { peak: number; normal: number; off: number; none: number };
}) {
  const W = 300;
  const H = 180;
  const pad = { l: 18, r: 18, t: 28, b: 28 };
  const innerW = W - pad.l - pad.r;
  const yMax = Math.max(values.peak, values.normal, values.off, values.none, 1);
  const yAt = (v: number) => pad.t + ((yMax - v) / yMax) * (H - pad.t - pad.b);
  const items = [
    { label: TOU_COLORS[0].label, color: TOU_COLORS[0].color, value: values.peak },
    { label: TOU_COLORS[1].label, color: TOU_COLORS[1].color, value: values.normal },
    { label: TOU_COLORS[2].label, color: TOU_COLORS[2].color, value: values.off },
    { label: TOU_COLORS[3].label, color: TOU_COLORS[3].color, value: values.none },
  ];
  const groupW = innerW / items.length;
  const barW = 28;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 h-[180px] w-full">
      {items.map((item, i) => {
        const x = pad.l + i * groupW + (groupW - barW) / 2;
        const h = Math.max(item.value === 0 ? 3 : 0, yAt(0) - yAt(item.value));
        return (
          <g key={item.label}>
            <text
              x={x + barW / 2}
              y={item.value === 0 ? H - pad.b - 10 : yAt(item.value) - 8}
              textAnchor="middle"
              className="fill-slate-600"
              fontSize="11"
            >
              {formatNum(item.value)}
            </text>
            <rect
              x={x}
              y={yAt(item.value) - (item.value === 0 ? 3 : 0)}
              width={barW}
              height={h}
              fill={item.color}
            />
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" className="fill-slate-600" fontSize="12">
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DataZoom({
  points,
  range,
  onRange,
}: {
  points: BarPoint[];
  range: { start: number; end: number };
  onRange: (range: { start: number; end: number }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<"start" | "end" | "move" | null>(null);
  const origin = useRef({ x: 0, start: 0, end: 0 });
  const max = Math.max(points.map((p) => p.kwh).reduce((a, b) => Math.max(a, b), 0), 1);
  const W = 500;
  const H = 46;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * W;
      const y = H - (p.kwh / max) * (H - 4) - 2;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const area = `${path} L ${W} ${H} L 0 ${H} Z`;
  const left = range.start / (points.length - 1);
  const right = range.end / (points.length - 1);

  const toIndex = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return 0;
    const t = (clientX - box.left) / box.width;
    return Math.round(Math.max(0, Math.min(1, t)) * (points.length - 1));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const idx = toIndex(e.clientX);
    if (drag.current === "start") {
      onRange({ start: Math.min(idx, range.end - 4), end: range.end });
    } else if (drag.current === "end") {
      onRange({ start: range.start, end: Math.max(idx, range.start + 4) });
    } else {
      const delta = idx - toIndex(origin.current.x);
      const span = origin.current.end - origin.current.start;
      let start = origin.current.start + delta;
      start = Math.max(0, Math.min(points.length - 1 - span, start));
      onRange({ start, end: start + span });
    }
  };

  return (
    <div
      ref={ref}
      className="relative mt-1 h-14 cursor-ew-resize select-none overflow-hidden rounded-sm bg-[#f7f9fc]"
      onPointerMove={onPointerMove}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerLeave={() => {
        drag.current = null;
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="none">
        <path d={area} fill="#c5d9f2" />
        <path d={path} fill="none" stroke="#8fb4e3" strokeWidth="1.2" />
      </svg>
      <div className="pointer-events-none absolute inset-y-0 bg-white/70" style={{ left: 0, width: `${left * 100}%` }} />
      <div className="pointer-events-none absolute inset-y-0 bg-white/70" style={{ left: `${right * 100}%`, right: 0 }} />
      <div
        className="absolute inset-y-0 border border-[#7aa3d6] bg-[#4f89d8]/15"
        style={{ left: `${left * 100}%`, width: `${(right - left) * 100}%` }}
        onPointerDown={(e) => {
          drag.current = "move";
          origin.current = { x: e.clientX, start: range.start, end: range.end };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        <button
          type="button"
          aria-label="Kéo đầu khoảng"
          className="absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize bg-[#7aa3d6]"
          onPointerDown={(e) => {
            e.stopPropagation();
            drag.current = "start";
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
        />
        <button
          type="button"
          aria-label="Kéo cuối khoảng"
          className="absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize bg-[#7aa3d6]"
          onPointerDown={(e) => {
            e.stopPropagation();
            drag.current = "end";
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
        />
      </div>
    </div>
  );
}

function LineChart({
  values,
  colors,
  names,
  yMin,
  yMax,
  zoom,
  hover,
  onHover,
}: {
  values: number[][];
  colors: string[];
  names: string[];
  yMin: number;
  yMax: number;
  zoom: number;
  hover: number | null;
  onHover: (index: number | null) => void;
}) {
  const W = 980;
  const H = 340;
  const pad = { l: 44, r: 36, t: 18, b: 36 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const visible = 24 / zoom;
  const start = (24 - visible) / 2;
  const xAt = (h: number) => pad.l + ((h - start) / visible) * innerW;
  const yAt = (v: number) => pad.t + ((yMax - v) / (yMax - yMin || 1)) * innerH;

  const paths = values.map((row) => toSmoothPath(row.map((v, h) => [xAt(h), yAt(v)])));
  const ticks = [0, 4, 8, 12, 16, 20, 24];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-[340px] w-full"
      onMouseLeave={() => onHover(null)}
      onMouseMove={(e) => {
        const box = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - box.left) / box.width) * W;
        const hour = start + ((x - pad.l) / innerW) * visible;
        onHover(Math.max(0, Math.min(24, Math.round(hour))));
      }}
    >
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = pad.t + innerH * (1 - t);
        return (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#eef1f5" />
            <text x={pad.l - 8} y={y + 4} textAnchor="end" className="fill-slate-400" fontSize="11">
              {Math.round(yMin + (yMax - yMin) * t)}
            </text>
          </g>
        );
      })}
      {ticks.map((h) => (
        <text
          key={h}
          x={xAt(h)}
          y={H - 12}
          textAnchor="middle"
          className="fill-slate-400"
          fontSize="11"
        >
          {h === 24 ? "23:59" : `${String(h).padStart(2, "0")}:00`}
        </text>
      ))}
      {paths.map((d, i) => (
        <path key={names[i]} d={d} fill="none" stroke={colors[i]} strokeWidth="2.4" />
      ))}
      {hover != null ? (
        <>
          <line
            x1={xAt(hover)}
            x2={xAt(hover)}
            y1={pad.t}
            y2={H - pad.b}
            stroke="#94a3b8"
            strokeDasharray="4 4"
          />
          {values.map((row, i) => (
            <circle key={names[i]} cx={xAt(hover)} cy={yAt(row[hover])} r="4" fill={colors[i]} />
          ))}
          <g transform={`translate(${Math.min(xAt(hover) + 12, W - 170)}, ${pad.t + 8})`}>
            <rect
              width="158"
              height={22 + Math.max(names.length, 1) * 14}
              rx="6"
              fill="white"
              stroke="#e2e8f0"
            />
            <text x="10" y="18" className="fill-slate-500" fontSize="11">
              {hover === 24 ? "23:59" : `${String(hover).padStart(2, "0")}:00`}
            </text>
            {names.map((name, i) => (
              <text key={`${name}-${i}`} x="10" y={36 + i * 14} fontSize="11" fill={colors[i]}>
                {name}: {values[i][hover].toFixed(1)}
              </text>
            ))}
          </g>
        </>
      ) : null}
    </svg>
  );
}

function toSmoothPath(points: number[][]) {
  if (points.length < 2) return "";
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>
        {value}
        <span className="ml-1.5 text-base font-medium text-slate-400">{unit}</span>
      </p>
    </article>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  active = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md ${
        active ? "bg-slate-100 text-slate-700" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}

function EnergyGlyph({
  type,
  className,
}: {
  type: "bolt" | "heat" | "air" | "water" | "steam";
  className?: string;
}) {
  if (type === "heat") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 20a5 5 0 0 0 5-5c0-3-5-8-5-8s-5 5-5 8a5 5 0 0 0 5 5Z" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (type === "air") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 9h12a3 3 0 1 0-3-3M4 15h14a3 3 0 1 1-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "water") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 4s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11Z" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (type === "steam") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 18h14M8 18V9l4-4 4 4v9M9.5 12h5M9.5 15h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 4.5 13.5h6.2L9.2 22 19.5 10h-6.2L13 2Z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 18V10M10 18V6M15 18v-5M20 18V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SigmaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M17 6H7l5 6-5 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M20 5v5h-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TableIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 10h16M10 5v14" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-5H10v5H5a1 1 0 0 1-1-1v-8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3 5 6v6c0 4.5 2.8 7.5 7 9 4.2-1.5 7-4.5 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
