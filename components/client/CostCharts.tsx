"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_TIME_FILTER,
  TimeFilterBar,
  timeFilterSpan,
  getTimeFilterLabel,
  getTimeFilterPeriods,
  periodIndexForInstant,
  type TimeFilterValue,
} from "@/components/client/TimeFilterBar";
import { hydrateClientMeters, loadClientMeters, orderMetersByTree } from "@/lib/client-meters";
import { loadProjectGatewayEnergySlots, type GatewayEnergySlot } from "@/lib/gateway-series";
import {
  civilWeekday,
  formatTariffPrice,
  industrialBand,
  parseTariffPrice,
  resolveTouPrices,
  voltageLevelById,
  type TouPrices,
  type VoltageLevelId,
} from "@/lib/industrial-electricity";
import { registerToKwh } from "@/lib/meter-parameters";
import { hydrateProjectSettings } from "@/lib/project-settings";
import { hydrateProjects, resolveMeterTypes, type MeterType } from "@/lib/projects";
import { vietnamFromStored, type VietnamParts } from "@/lib/vietnam-time";

type CostPoint = {
  id: string;
  code: string;
  name: string;
  energy: string;
  color: string;
};

const POINT_COLORS = ["#059669", "#10b981", "#e67e22", "#8b5cf6", "#06b6d4", "#ef4444", "#a16207"];

const ENERGY_KIND_META: Record<string, "bolt" | "heat" | "air" | "steam" | "water"> = {
  Điện: "bolt",
  Nhiệt: "heat",
  "Khí nén": "air",
  Hơi: "steam",
  Nước: "water",
};

const TOU = [
  { id: "peak", label: "Cao", color: "#e67e22" },
  { id: "normal", label: "Thường", color: "#27ae60" },
  { id: "off", label: "Thấp", color: "#7ec8e3" },
  { id: "none", label: "Không", color: "#9aa3af" },
] as const;

type Band = "peak" | "normal" | "off" | "none";
type CostBar = { key: string | number; label: string; light: number; dark: number };
type TouKwh = Record<Band, number>;
type RateSource =
  | { kind: "flat"; price: number }
  | { kind: "tou"; prices: TouPrices };

function formatVnd(n: number) {
  return Math.round(n).toLocaleString("vi-VN");
}

function formatKwh(n: number) {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
}

function emptyKwh(): TouKwh {
  return { peak: 0, normal: 0, off: 0, none: 0 };
}

function rateAt(source: RateSource, parts: VietnamParts): { price: number; band: Band } {
  if (source.kind === "flat") return { price: source.price, band: "normal" };
  const band = industrialBand(civilWeekday(parts.year, parts.month, parts.day), parts.hour, parts.minute);
  return { price: source.prices[band], band };
}

function slotStoredAt(day: string, hour: number, minute: number) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date, hour, minute) - 7 * 60 * 60 * 1000).toISOString().slice(0, 19);
}

function addSlotCost(
  filter: TimeFilterValue,
  bars: CostBar[],
  tou: TouKwh,
  kwh: TouKwh,
  source: RateSource,
  at: string,
  deltaKwh: number,
) {
  if (deltaKwh <= 0) return false;
  const parts = vietnamFromStored(at);
  const bucket = periodIndexForInstant(filter, at, bars.length);
  if (!parts || bucket < 0) return false;
  const rate = rateAt(source, parts);
  const cost = deltaKwh * rate.price;
  bars[bucket].dark += cost;
  tou[rate.band] += cost;
  kwh[rate.band] += deltaKwh;
  return true;
}

function costBarsFromSlots(filter: TimeFilterValue, slots: GatewayEnergySlot[], source: RateSource) {
  const bars: CostBar[] = getTimeFilterPeriods(filter).map((period) => ({
    key: period.key,
    label: period.label,
    light: 0,
    dark: 0,
  }));
  const tou = emptyKwh();
  const kwh = emptyKwh();
  const ordered = [...slots].sort(
    (a, b) => a.day.localeCompare(b.day) || a.hour - b.hour || a.minute - b.minute,
  );
  // Chỉ tính ΔkWh (chỉ số tăng thêm). Không nhân cả chỉ số tích lũy EPaed.
  let previous: number | null = null;
  let lastIndexKwh = 0;
  for (const slot of ordered) {
    const startKwh = registerToKwh(slot.firstWh);
    const endKwh = registerToKwh(slot.lastWh);
    const at = slotStoredAt(slot.day, slot.hour, slot.minute);
    const bucket = periodIndexForInstant(filter, at, bars.length);
    if (bucket >= 0) bars[bucket].light += 1;
    const within = Math.max(0, endKwh - startKwh);
    const gap = previous == null ? 0 : Math.max(0, startKwh - previous);
    addSlotCost(filter, bars, tou, kwh, source, at, within + gap);
    previous = endKwh;
    lastIndexKwh = endKwh;
  }
  return {
    bars,
    tou,
    kwh,
    sampleDays: new Set(ordered.map((slot) => slot.day)).size,
    slotCount: ordered.length,
    lastIndexKwh,
  };
}

function costLabel(energy: string) {
  if (energy === "Nhiệt") return "Chi phí nhiệt năng";
  if (energy === "Khí nén") return "Chi phí khí nén";
  if (energy === "Hơi") return "Chi phí hơi";
  if (energy === "Nước") return "Chi phí nước";
  return "Chi phí điện năng";
}

function costSeriesForFilter(filter: TimeFilterValue) {
  return getTimeFilterPeriods(filter).map((period) => ({
    key: period.key,
    label: period.label,
    light: 0,
    dark: 0,
  }));
}

export function CostCharts() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "default";
  const [energyKinds, setEnergyKinds] = useState<MeterType[]>(() => resolveMeterTypes(null));
  const [energy, setEnergy] = useState<string>("Điện");
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>(DEFAULT_TIME_FILTER);
  const [allPoints, setAllPoints] = useState<CostPoint[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSum, setShowSum] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [slots, setSlots] = useState<GatewayEnergySlot[]>([]);
  const [voltageLevel, setVoltageLevel] = useState<VoltageLevelId>("kv-under-6");
  const [touPrices, setTouPrices] = useState<TouPrices>(() => resolveTouPrices("kv-under-6").prices);
  const [flatPrices, setFlatPrices] = useState<Record<string, number>>({});
  const [reloadKey, setReloadKey] = useState(0);
  const monthAligned = useRef(false);
  const filterTouched = useRef(false);
  const selectionTouched = useRef(false);

  useEffect(() => {
    monthAligned.current = false;
    filterTouched.current = false;
    selectionTouched.current = false;
  }, [projectId]);

  useEffect(() => {
    let active = true;
    const reload = () => {
      void Promise.all([
        hydrateProjects(),
        hydrateClientMeters(projectId),
        hydrateProjectSettings(projectId),
      ]).then(([projects, meterRows, settings]) => {
        if (!active) return;
        const saved = settings.costConfig as {
          flatPrices?: Record<string, string>;
          electricity?: {
            voltageLevel?: string;
            prices?: Partial<Record<"normal" | "off" | "peak", string>>;
          };
        } | undefined;
        const tariff = resolveTouPrices(saved?.electricity?.voltageLevel, saved?.electricity?.prices);
        setVoltageLevel(tariff.levelId);
        setTouPrices(tariff.prices);
        setFlatPrices(
          Object.fromEntries(
            Object.entries(saved?.flatPrices ?? {}).map(([key, value]) => [key, parseTariffPrice(value)]),
          ),
        );
        const project = projects.find((item) => item.id === projectId);
        const types = resolveMeterTypes(project);
        setEnergyKinds(types);
        setEnergy((current) => (types.includes(current) ? current : types[0] ?? "Điện"));
        const meters = orderMetersByTree(meterRows.length ? meterRows : loadClientMeters(projectId));
        if (!meters.length) {
          setAllPoints([]);
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
  }, [projectId, reloadKey]);

  useEffect(() => {
    const span = timeFilterSpan(timeFilter);
    let active = true;
    void loadProjectGatewayEnergySlots(projectId, span.from, span.to).then((summary) => {
      if (!active) return;
      setSlots(summary.slots);
      if (filterTouched.current) return;
      const days = [...new Set(summary.slots.map((slot) => slot.day))].sort();
      if (days.length > 0) {
        if (monthAligned.current) return;
        monthAligned.current = true;
        const first = days[0];
        const last = days[days.length - 1];
        setTimeFilter((current) =>
          current.mode === "custom_date" &&
          current.customDateMode === "range" &&
          current.startDate === first &&
          current.endDate === last
            ? current
            : {
                ...current,
                mode: "custom_date",
                customDateMode: "range",
                startDate: first,
                endDate: last,
                date: last,
                month: last.slice(0, 7),
                year: Number(last.slice(0, 4)),
              },
        );
        return;
      }
      if (monthAligned.current || !summary.latest) return;
      const parts = vietnamFromStored(summary.latest.at);
      if (!parts || (timeFilter.mode === "month" && timeFilter.month === parts.monthKey)) {
        monthAligned.current = true;
        return;
      }
      setTimeFilter((current) => ({ ...current, mode: "month", month: parts.monthKey, year: parts.year }));
    });
    return () => {
      active = false;
    };
  }, [projectId, timeFilter]);

  const pointsForEnergy = useMemo(
    () => allPoints.filter((p) => p.energy === energy),
    [allPoints, energy],
  );

  const filteredPoints = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pointsForEnergy;
    return pointsForEnergy.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q),
    );
  }, [pointsForEnergy, query]);

  useEffect(() => {
    setSelectedIds((current) => {
      const kept = current.filter((id) => pointsForEnergy.some((p) => p.id === id));
      if (selectionTouched.current) return kept;
      const linked = pointsForEnergy.filter((point) => slots.some((slot) => slot.meterPointId === point.id));
      if (linked.length > 0 && !kept.some((id) => linked.some((point) => point.id === id))) {
        return linked.slice(0, 1).map((point) => point.id);
      }
      if (kept.length > 0) return kept;
      const source = linked.length > 0 ? linked : pointsForEnergy;
      return source.slice(0, 1).map((point) => point.id);
    });
  }, [pointsForEnergy, slots]);

  const selectedPoints = useMemo(
    () => pointsForEnergy.filter((p) => selectedIds.includes(p.id)),
    [pointsForEnergy, selectedIds],
  );

  const rateSource = useMemo<RateSource>(() => {
    if (energy === "Điện") return { kind: "tou", prices: touPrices };
    return { kind: "flat", price: flatPrices[energy] ?? 0 };
  }, [energy, flatPrices, touPrices]);

  const series = useMemo(
    () =>
      selectedPoints.map((point) => {
        const result = costBarsFromSlots(
          timeFilter,
          slots.filter((slot) => slot.meterPointId === point.id),
          rateSource,
        );
        return {
          point,
          bars: result.bars,
          tou: result.tou,
          kwh: result.kwh,
          sampleDays: result.sampleDays,
          slotCount: result.slotCount,
          lastIndexKwh: result.lastIndexKwh,
        };
      }),
    [rateSource, slots, selectedPoints, timeFilter],
  );

  const primaryBars = series[0]?.bars ?? costSeriesForFilter(timeFilter);
  const grandTotal = series.reduce(
    (sum, item) => sum + item.bars.reduce((s, b) => s + b.dark, 0),
    0,
  );
  const pointTotals = useMemo(
    () =>
      series.map((item) => ({
        point: item.point,
        total: item.bars.reduce((s, b) => s + b.dark, 0),
      })),
    [series],
  );

  const tou = useMemo(
    () => series.reduce(
      (sum, item) => ({
        peak: sum.peak + item.tou.peak,
        normal: sum.normal + item.tou.normal,
        off: sum.off + item.tou.off,
        none: sum.none + item.tou.none,
      }),
      { peak: 0, normal: 0, off: 0, none: 0 },
    ),
    [series],
  );

  const kwh = useMemo(
    () => series.reduce(
      (sum, item) => ({
        peak: sum.peak + item.kwh.peak,
        normal: sum.normal + item.kwh.normal,
        off: sum.off + item.kwh.off,
        none: sum.none + item.kwh.none,
      }),
      emptyKwh(),
    ),
    [series],
  );

  const voltageLabel = voltageLevelById(voltageLevel).label;

  function togglePoint(id: string) {
    selectionTouched.current = true;
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }
      return [...current, id];
    });
  }

  function selectAllVisible() {
    selectionTouched.current = true;
    setSelectedIds(filteredPoints.map((p) => p.id));
  }

  function clearSelection() {
    selectionTouched.current = true;
    setSelectedIds([]);
  }

  const exportCsv = () => {
    const periodName = getTimeFilterLabel(timeFilter);
    const header = ["Thời điểm", ...selectedPoints.map((p) => `${p.code} ${p.name}`)].join(",");
    const rows = primaryBars.map((bar, i) =>
      [bar.label, ...series.map((s) => s.bars[i]?.dark ?? 0)].join(","),
    );
    const blob = new Blob([[`# Kỳ: ${periodName}`, header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chi-phi-${energy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full min-h-0 bg-[#f4f6f9]">
      <aside className="flex w-[270px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h1 className="text-[18px] font-bold text-slate-800">Biểu Đồ Chi Phí</h1>
          <p className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-slate-400">
            ANALYSIS CATEGORIES
          </p>
        </div>

        <div className="px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-slate-400">
            LOẠI CHI PHÍ
          </p>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">
            {costLabel(energy)}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-3">
          <p className="mb-1 text-[11px] font-semibold tracking-[0.08em] text-slate-400">
            DANH SÁCH ĐIỂM ĐO · {energy.toUpperCase()}
          </p>
          <p className="mb-2 text-[11px] leading-4 text-slate-500">
            Tick chọn điểm đo cần hiển thị tham số trên biểu đồ
          </p>
          <label className="relative mb-2 block">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
              <SearchIcon className="h-3.5 w-3.5" />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm điểm đo..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 transition-colors"
            />
          </label>
          <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>Đã chọn {selectedPoints.length}/{filteredPoints.length}</span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllVisible}
                className="font-semibold text-emerald-600 hover:underline"
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
                Không có điểm đo loại {energy}
              </li>
            ) : (
              filteredPoints.map((point, index) => {
                const checked = selectedIds.includes(point.id);
                return (
                  <li key={point.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition-colors ${
                        checked
                          ? "bg-emerald-600 text-white shadow-xs font-medium"
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
                          className={`block truncate text-[13px] font-semibold ${
                            checked ? "text-white" : "text-slate-800"
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

        <div className="p-4">
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 text-[13px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
          >
            <RefreshIcon className="h-4 w-4" />
            Refresh Data
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
            {energyKinds.map((item) => {
              const active = energy === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setEnergy(item)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-all ${
                    active ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <EnergyGlyph type={ENERGY_KIND_META[item] ?? "bolt"} className="h-3.5 w-3.5" />
                  {item}
                </button>
              );
            })}
          </div>
          <TimeFilterBar
            value={timeFilter}
            onChange={(next) => {
              filterTouched.current = true;
              setTimeFilter(next);
            }}
          />
        </div>

        <div className="mt-4 grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-800">Chi tiết chi phí</h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-600">
                  {selectedPoints.length === 0 ? (
                    <span className="text-slate-400">Chọn điểm đo bên trái</span>
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
                      Σ {formatVnd(grandTotal)} VND
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center">
                <IconBtn label="Biểu đồ cột" active>
                  <BarIcon className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="Tổng" active={showSum} onClick={() => setShowSum((v) => !v)}>
                  <SigmaIcon className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="Xuất dữ liệu" onClick={exportCsv}>
                  <SaveIcon className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="Làm mới" onClick={() => setReloadKey((value) => value + 1)}>
                  <RefreshIcon className="h-4 w-4" />
                </IconBtn>
              </div>
            </div>
            {series.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-400">
                Chưa có điểm đo loại {energy} để hiển thị chi phí
              </p>
            ) : (
              <>
                {slots.length > 0 && series.every((item) => item.slotCount === 0) ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
                    API đã trả {slots.length} khung giờ, nhưng điểm đo đang chọn không khớp `meterPointId` của series.
                    Chọn đúng điểm đo có dữ liệu (ví dụ {slots[0]?.meterPointId}) để xem chi phí.
                  </div>
                ) : null}
                {grandTotal <= 0 && series.some((item) => item.slotCount > 0) ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
                    Series đã trả {series.reduce((sum, item) => sum + item.slotCount, 0)} khung giờ /
                    {" "}{Math.max(...series.map((item) => item.sampleDays), 0)} ngày có bản tin.
                    Chỉ số EPaed đứng yên (ví dụ {formatKwh(Math.max(...series.map((item) => item.lastIndexKwh), 0))} kWh)
                    nên sản lượng từng ngày = 0 kWh và cột chi phí = 0 VND. Khi công tơ tăng, cột sẽ hiện đúng theo từng ngày.
                  </div>
                ) : null}
                <MultiCostBarChart series={series} hover={hover} onHover={setHover} />
              </>
            )}
          </article>

          <div className="flex min-h-0 flex-col gap-4">
            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <h2 className="text-center text-[13px] font-bold tracking-wide text-slate-700">
                TỔNG HỢP CHI PHÍ THEO ĐIỂM ĐO
              </h2>
              <Donut value={grandTotal} segments={pointTotals} />
              <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto">
                {pointTotals.map((item) => {
                  const pct = grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0;
                  return (
                    <div
                      key={item.point.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-[12px] text-slate-700"
                    >
                      <p className="flex items-start gap-2">
                        <span
                          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.point.color }}
                        />
                        <span>
                          ({item.point.code}) {item.point.name}
                          <span className="mt-0.5 block font-semibold">
                            {formatVnd(item.total)} VND (~{pct}%)
                          </span>
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </article>

            {energy === "Điện" ? (
              <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <h2 className="text-center text-[13px] font-bold tracking-wide text-slate-700">
                  TIỀN ĐIỆN THEO KHUNG GIỜ
                </h2>
                <p className="mt-1 text-center text-[11px] text-slate-400">{voltageLabel}</p>
                <TouChart values={tou} />
                <table className="mt-2 w-full text-left text-[11px]">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="py-1 font-semibold">Khung giờ</th>
                      <th className="py-1 text-right font-semibold">kWh</th>
                      <th className="py-1 text-right font-semibold">Đơn giá</th>
                      <th className="py-1 text-right font-semibold">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {(
                      [
                        ["normal", "Bình thường"],
                        ["off", "Thấp điểm"],
                        ["peak", "Cao điểm"],
                      ] as const
                    ).map(([band, label]) => (
                      <tr key={band} className="border-t border-slate-100">
                        <td className="py-1.5">{label}</td>
                        <td className="py-1.5 text-right font-mono">{formatKwh(kwh[band])}</td>
                        <td className="py-1.5 text-right font-mono">{formatTariffPrice(touPrices[band])}</td>
                        <td className="py-1.5 text-right font-mono">{formatVnd(tou[band])}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-200 font-semibold text-slate-800">
                      <td className="py-1.5">Tổng</td>
                      <td className="py-1.5 text-right font-mono">
                        {formatKwh(kwh.normal + kwh.off + kwh.peak)}
                      </td>
                      <td />
                      <td className="py-1.5 text-right font-mono">
                        {formatVnd(tou.normal + tou.off + tou.peak)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                  Tiền điện năng trước thuế. Chưa gồm VAT và công suất phản kháng.
                </p>
              </article>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-500">
          <p className="inline-flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${grandTotal > 0 ? "bg-emerald-500" : "bg-slate-300"}`} />
            {grandTotal > 0
              ? energy === "Điện"
                ? "Tiền điện = sản lượng từng khung giờ (chỉ số cuối − chỉ số đầu) × đơn giá khung giờ tương ứng. Chưa gồm VAT."
                : `Chi phí = sản lượng × ${formatVnd(flatPrices[energy] ?? 0)} VNĐ.`
              : slots.length > 0 && energy === "Điện"
                ? `Đã lấy ${Math.max(...series.map((item) => item.sampleDays), 0)} ngày có bản tin trong kỳ, nhưng EPaed không tăng (first = last) nên sản lượng và tiền điện mỗi ngày đều là 0. Chưa gồm VAT.`
                : "Chưa có số liệu chi phí trong kỳ này"}
          </p>
        </div>
      </div>
    </div>
  );
}

function MultiCostBarChart({
  series,
  hover,
  onHover,
}: {
  series: {
    point: CostPoint;
    bars: CostBar[];
  }[];
  hover: number | null;
  onHover: (index: number | null) => void;
}) {
  const W = 1080;
  const H = 360;
  const pad = { l: 52, r: 16, t: 28, b: 32 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const base = series[0]?.bars ?? [];
  const maxValue = Math.max(...series.flatMap((s) => s.bars.map((b) => b.dark)), 0);
  const yMax = maxValue <= 0
    ? 1000
    : maxValue < 1000
      ? Math.ceil(maxValue / 100) * 100
      : Math.ceil(maxValue / 2000) * 2000;
  const yAt = (v: number) => pad.t + ((yMax - v) / yMax) * innerH;
  const groupW = innerW / Math.max(base.length, 1);
  const barCount = Math.max(series.length, 1);
  const barW = Math.max(4, groupW / (barCount + 0.8));
  const labelStep = Math.max(1, Math.ceil(base.length / 12));
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (yMax * i) / tickCount);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto mt-2 h-[360px] w-full max-w-[1080px]"
      onMouseLeave={() => onHover(null)}
    >
      <text x={pad.l} y="16" className="fill-slate-400" fontSize="12">
        (VND)
      </text>
      {ticks.map((v) => {
        const y = yAt(v);
        return (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#eceff3" />
            <text x={pad.l - 8} y={y + 4} textAnchor="end" className="fill-slate-400" fontSize="11">
              {v === 0 ? "0" : v.toLocaleString("vi-VN")}
            </text>
          </g>
        );
      })}
      {base.map((bar, i) => {
        const gx = pad.l + i * groupW;
        const hasSamples = series.some((item) => (item.bars[i]?.light ?? 0) > 0);
        return (
          <g key={bar.key} onMouseEnter={() => onHover(i)}>
            {hasSamples ? (
              <rect
                x={gx + 2}
                y={pad.t}
                width={Math.max(groupW - 4, 2)}
                height={innerH}
                fill="#ecfdf5"
                opacity={hover == null || hover === i ? 0.85 : 0.35}
              />
            ) : null}
            {series.map((item, sIdx) => {
              const value = item.bars[i]?.dark ?? 0;
              const samples = item.bars[i]?.light ?? 0;
              const x = gx + groupW * 0.15 + sIdx * barW;
              const width = Math.max(3, barW * 0.85);
              if (value > 0) {
                return (
                  <rect
                    key={item.point.id}
                    x={x}
                    y={yAt(value)}
                    width={width}
                    height={Math.max(0, yAt(0) - yAt(value))}
                    fill={item.point.color}
                    opacity={hover == null || hover === i ? 1 : 0.4}
                  />
                );
              }
              if (samples > 0) {
                return (
                  <g key={item.point.id}>
                    <line
                      x1={x}
                      x2={x + width}
                      y1={yAt(0) - 1}
                      y2={yAt(0) - 1}
                      stroke={item.point.color}
                      strokeWidth="3"
                      opacity={hover == null || hover === i ? 1 : 0.4}
                    />
                    <circle
                      cx={x + width / 2}
                      cy={yAt(0) - 6}
                      r="3.5"
                      fill={item.point.color}
                      opacity={hover == null || hover === i ? 1 : 0.4}
                    />
                  </g>
                );
              }
              return null;
            })}
            {i % labelStep === 0 || i === base.length - 1 ? (
              <text
                x={gx + groupW / 2}
                y={H - 10}
                textAnchor="middle"
                className="fill-slate-500"
                fontSize="11"
              >
                {bar.label}
              </text>
            ) : null}
          </g>
        );
      })}
      {hover != null && base[hover] ? (
        <g transform={`translate(${Math.min(pad.l + hover * groupW + 12, W - 200)}, ${pad.t + 6})`}>
          <rect
            width="188"
            height={28 + series.length * 28}
            rx="4"
            fill="white"
            stroke="#e2e8f0"
          />
          <text x="10" y="16" className="fill-slate-500" fontSize="11">
            {base[hover].label}
          </text>
          {series.map((item, i) => {
            const samples = item.bars[hover]?.light ?? 0;
            const cost = item.bars[hover]?.dark ?? 0;
            return (
              <g key={item.point.id}>
                <text x="10" y={34 + i * 28} fontSize="11" fontWeight="600" fill={item.point.color}>
                  {item.point.code}: {formatVnd(cost)} VND
                </text>
                <text x="10" y={48 + i * 28} fontSize="10" fill="#64748b">
                  {samples > 0 ? `${samples} khung đo` : "Không có bản tin"}
                </text>
              </g>
            );
          })}
        </g>
      ) : null}
    </svg>
  );
}

function Donut({
  value,
  segments,
}: {
  value: number;
  segments: { point: CostPoint; total: number }[];
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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[22px] font-bold leading-none text-slate-800">{formatVnd(value)}</p>
        <p className="mt-1 text-[12px] text-slate-500">VND</p>
      </div>
    </div>
  );
}

function TouChart({ values }: { values: { peak: number; normal: number; off: number; none: number } }) {
  const W = 300;
  const H = 180;
  const pad = { l: 18, r: 18, t: 28, b: 28 };
  const innerW = W - pad.l - pad.r;
  const yMax = Math.max(values.peak, values.normal, values.off, values.none, 1);
  const yAt = (v: number) => pad.t + ((yMax - v) / yMax) * (H - pad.t - pad.b);
  const items = [
    { label: "Cao", color: TOU[0].color, value: values.peak },
    { label: "Thường", color: TOU[1].color, value: values.normal },
    { label: "Thấp", color: TOU[2].color, value: values.off },
    { label: "Không", color: TOU[3].color, value: values.none },
  ].filter((item) => item.label !== "Không" || item.value > 0);
  const groupW = innerW / items.length;
  const barW = 28;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto mt-1 h-[180px] w-full max-w-[1080px]"
    >
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
              {formatVnd(item.value)}
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
  type: "bolt" | "heat" | "air" | "steam" | "water";
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
  if (type === "steam") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 18h14M8 18V9l4-4 4 4v9M9.5 12h5M9.5 15h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 4.5 13.5h6.2L9.2 22 19.5 10h-6.2L13 2Z" />
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

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 3.5h8L19.5 8V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 3.5V9h7" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5V7M16 3.5V7M4 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
