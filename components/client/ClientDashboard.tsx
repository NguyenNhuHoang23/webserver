"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "@/lib/projects";
import { hydrateAlertEvents, type AlertEvent } from "@/lib/alert-events";
import { hydrateClientMeters } from "@/lib/client-meters";
import { hydrateGhgSources } from "@/lib/ghg-sources";
import {
  civilWeekday,
  industrialBand,
  resolveTouPrices,
  type TouPrices,
} from "@/lib/industrial-electricity";
import { registerToKwh } from "@/lib/meter-parameters";
import { effectiveRegisterKwh } from "@/lib/meter-replacements";
import { hydrateProjectSettings } from "@/lib/project-settings";
import {
  isGatewaySampleOnline,
  loadProjectGatewayDailyRange,
  loadProjectGatewayEnergySlots,
  loadProjectGatewayLatest,
  loadProjectGatewaySamples,
  type GatewayDailyPoint,
  type GatewayEnergySlot,
  type ProjectGatewaySample,
} from "@/lib/gateway-series";
import { formatStoredVietnam, vietnamFromStored } from "@/lib/vietnam-time";
import {
  DEFAULT_TIME_FILTER,
  getTimeFilterLabel,
  getTimeFilterPeriods,
  periodIndexForInstant,
  shiftTimeFilter,
  TimeFilterBar,
  timeFilterSpan,
  type TimeFilterValue,
} from "@/components/client/TimeFilterBar";

type DashboardAlert = { id: string; time: string; point: string; param: string; value: string };
type EnergyPoint = { day: string; kwh: number; hasSample: boolean };
type StatusSlice = { label: string; value: number; color: string };

const EMPTY_STATUS: StatusSlice[] = [
  { label: "BÌNH THƯỜNG", value: 0, color: "#43a047" },
  { label: "CẢNH BÁO", value: 0, color: "#ef8d3a" },
  { label: "NGOẠI TUYẾN", value: 0, color: "#9aa3af" },
];

function formatKwh(value: number) {
  if (!Number.isFinite(value)) return "0.0";
  const digits = Math.abs(value) > 0 && Math.abs(value) < 10 ? 3 : 1;
  return value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function formatReading(value: number, digits: number) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function formatVnd(value: number) {
  return Math.round(value).toLocaleString("vi-VN");
}

function slotStoredAt(day: string, hour: number, minute: number) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour, minute) - 7 * 60 * 60 * 1000).toISOString().slice(0, 19);
}

function monthlyCostFromSlots(slots: GatewayEnergySlot[], prices: TouPrices) {
  const byMeter = new Map<string, GatewayEnergySlot[]>();
  for (const slot of slots) {
    const list = byMeter.get(slot.meterPointId) ?? [];
    list.push(slot);
    byMeter.set(slot.meterPointId, list);
  }
  let total = 0;
  for (const list of byMeter.values()) {
    const ordered = [...list].sort(
      (a, b) => a.day.localeCompare(b.day) || a.hour - b.hour || a.minute - b.minute,
    );
    let previous: number | null = null;
    for (const slot of ordered) {
      const offset = slot.offsetKwh ?? 0;
      const startKwh = effectiveRegisterKwh(slot.firstWh, offset);
      const endKwh = effectiveRegisterKwh(slot.lastWh, offset);
      const within = Math.max(0, endKwh - startKwh);
      const gap = previous == null ? 0 : Math.max(0, startKwh - previous);
      const delta = within + gap;
      previous = endKwh;
      if (delta <= 0) continue;
      const parts = vietnamFromStored(slotStoredAt(slot.day, slot.hour, slot.minute));
      if (!parts) continue;
      const band = industrialBand(civilWeekday(parts.year, parts.month, parts.day), parts.hour, parts.minute);
      total += delta * prices[band];
    }
  }
  return total;
}

function energySeriesFromDaily(filter: TimeFilterValue, rows: GatewayDailyPoint[]): EnergyPoint[] {
  const periods = getTimeFilterPeriods(filter);
  const kwh = periods.map(() => 0);
  const hasSample = periods.map(() => false);
  for (const row of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.day)) continue;
    const index = periodIndexForInstant(filter, `${row.day}T00:00:00`, periods.length);
    if (index < 0) continue;
    const offset = Number(row.offsetKwh) || 0;
    const firstKwh = effectiveRegisterKwh(Number(row.firstWh), offset);
    const lastKwh = effectiveRegisterKwh(Number(row.lastWh), offset);
    if (!Number.isFinite(firstKwh) || !Number.isFinite(lastKwh)) continue;
    kwh[index] += Math.max(0, lastKwh - firstKwh);
    hasSample[index] = true;
  }
  return periods.map((period, index) => ({
    day: period.label,
    kwh: kwh[index],
    hasSample: hasSample[index],
  }));
}

function energySeriesFromSamples(filter: TimeFilterValue, samples: ProjectGatewaySample[]): EnergyPoint[] {
  const periods = getTimeFilterPeriods(filter);
  const byMeterPeriod = new Map<string, number[]>();
  for (const sample of samples) {
    const wh = sample.values.EPaed;
    if (typeof wh !== "number" || !Number.isFinite(wh)) continue;
    const index = periodIndexForInstant(filter, sample.at, periods.length);
    if (index < 0) continue;
    const key = `${sample.meterPointId}::${index}`;
    const list = byMeterPeriod.get(key) ?? [];
    list.push(wh);
    byMeterPeriod.set(key, list);
  }
  const kwh = periods.map(() => 0);
  const hasSample = periods.map(() => false);
  for (const [key, list] of byMeterPeriod) {
    const index = Number(key.split("::")[1]);
    if (!Number.isInteger(index) || index < 0 || index >= periods.length) continue;
    hasSample[index] = true;
    if (list.length >= 2) {
      kwh[index] += Math.max(0, (list[list.length - 1] - list[0]) / 1000);
    }
  }
  return periods.map((period, index) => ({
    day: period.label,
    kwh: kwh[index],
    hasSample: hasSample[index],
  }));
}

function totalKwhFromDaily(rows: GatewayDailyPoint[]) {
  let total = 0;
  for (const row of rows) {
    const offset = Number(row.offsetKwh) || 0;
    const firstKwh = effectiveRegisterKwh(Number(row.firstWh), offset);
    const lastKwh = effectiveRegisterKwh(Number(row.lastWh), offset);
    if (!Number.isFinite(firstKwh) || !Number.isFinite(lastKwh)) continue;
    total += Math.max(0, lastKwh - firstKwh);
  }
  return total;
}

export function ClientDashboard({ project }: { project: Project }) {
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>(DEFAULT_TIME_FILTER);
  const [dailyRows, setDailyRows] = useState<GatewayDailyPoint[]>([]);
  const [gatewaySamples, setGatewaySamples] = useState<ProjectGatewaySample[]>([]);
  const [periodSlots, setPeriodSlots] = useState<GatewayEnergySlot[]>([]);
  const [latest, setLatest] = useState<ProjectGatewaySample | null>(null);
  const [touPrices, setTouPrices] = useState<TouPrices>(() => resolveTouPrices("kv-under-6").prices);
  const [deviceStatus, setDeviceStatus] = useState(EMPTY_STATUS);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [co2, setCo2] = useState(0);
  const [ghgSourceCount, setGhgSourceCount] = useState(0);
  const [prevPeriodKwh, setPrevPeriodKwh] = useState<number | null>(null);
  const [meterPointIds, setMeterPointIds] = useState<string[]>([]);
  const alignedFilter = useRef(false);
  const filterTouched = useRef(false);

  useEffect(() => {
    alignedFilter.current = false;
    filterTouched.current = false;
  }, [project.id]);

  useEffect(() => {
    let active = true;
    const reload = () => {
      void Promise.all([
        hydrateAlertEvents(project.id),
        hydrateClientMeters(project.id),
        hydrateGhgSources(project.id),
        hydrateProjectSettings(project.id),
        loadProjectGatewayLatest(project.id),
      ])
        .then(([alertEvents, meters, sources, settings, latestSamples]) => {
          if (!active) return;
          const saved = settings.costConfig as {
            electricity?: {
              voltageLevel?: string;
              prices?: Partial<Record<"normal" | "off" | "peak", string>>;
            };
          } | undefined;
          setTouPrices(resolveTouPrices(saved?.electricity?.voltageLevel, saved?.electricity?.prices).prices);
          setMeterPointIds(meters.map((meter) => meter.id));

          // Chỉ đếm điểm đo của dự án; trạng thái lấy từ bản tin Gateway thật (không dùng catalog / fallback toàn thư viện).
          const sampleByMeter = new Map(latestSamples.map((sample) => [sample.meterPointId, sample]));
          const openAlertMeters = new Set(
            alertEvents
              .filter((event) => event.status !== "resolved")
              .map((event) => event.meterPointId)
              .filter(Boolean),
          );
          const counts = { normal: 0, warning: 0, offline: 0 };
          for (const meter of meters) {
            if (!meter.deviceId && !meter.serialNumber?.trim()) {
              counts.offline += 1;
              continue;
            }
            const sample = sampleByMeter.get(meter.id);
            if (!sample || !isGatewaySampleOnline(sample.at)) {
              counts.offline += 1;
              continue;
            }
            if (openAlertMeters.has(meter.id)) counts.warning += 1;
            else counts.normal += 1;
          }
          setDeviceStatus([
            { label: "BÌNH THƯỜNG", value: counts.normal, color: "#43a047" },
            { label: "CẢNH BÁO", value: counts.warning, color: "#ef8d3a" },
            { label: "NGOẠI TUYẾN", value: counts.offline, color: "#9aa3af" },
          ]);
          setAlerts(
            alertEvents.slice(0, 12).map((event: AlertEvent) => ({
              id: event.id ?? `${event.occurredAt}-${event.meterPointId}-${event.parameter}`,
              time: formatStoredVietnam(event.occurredAt) ?? event.occurredAt,
              point: event.pointName ?? event.meterPointId ?? "--",
              param: event.parameter,
              value: `${event.value}${event.unit ? ` ${event.unit}` : ""}`,
            })),
          );
          setGhgSourceCount(sources.length);
          setCo2(sources.reduce((sum, source) => sum + (source.tons ?? 0), 0));
        })
        .catch(() => undefined);
    };
    reload();
    window.addEventListener("ems-alert-events-changed", reload);
    window.addEventListener("ems-client-meters-changed", reload);
    return () => {
      active = false;
      window.removeEventListener("ems-alert-events-changed", reload);
      window.removeEventListener("ems-client-meters-changed", reload);
    };
  }, [project.id]);

  useEffect(() => {
    let active = true;
    const span = timeFilterSpan(timeFilter);
    const prevFilter = shiftTimeFilter(timeFilter, -1);
    const prevSpan = timeFilterSpan(prevFilter);

    const ids = meterPointIds.length ? meterPointIds : undefined;
    const sampleLimit = Math.min(4000, Math.max(400, (ids?.length ?? 8) * 80));

    const loadCurrent = span.hourly
      ? Promise.all([
          loadProjectGatewaySamples(project.id, {
            from: span.from,
            to: span.to,
            limit: sampleLimit,
            meterPointIds: ids,
          }),
          loadProjectGatewayEnergySlots(project.id, span.from, span.to, ids),
          loadProjectGatewayDailyRange(project.id, span.from, span.to, ids),
        ]).then(([samples, slots, summary]) => ({
          samples,
          slots: slots.slots,
          days: summary.days,
          latest: slots.latest ?? summary.latest,
        }))
      : Promise.all([
          loadProjectGatewayDailyRange(project.id, span.from, span.to, ids),
          loadProjectGatewayEnergySlots(project.id, span.from, span.to, ids),
          loadProjectGatewaySamples(project.id, {
            from: span.from,
            to: span.to,
            limit: Math.min(1200, sampleLimit),
            meterPointIds: ids,
          }),
        ]).then(([summary, slots, samples]) => ({
          samples,
          slots: slots.slots,
          days: summary.days,
          latest: summary.latest ?? slots.latest,
        }));

    const loadPrev =
      timeFilter.mode === "month"
        ? loadProjectGatewayDailyRange(project.id, prevSpan.from, prevSpan.to, ids).then((summary) =>
            summary.days.length ? totalKwhFromDaily(summary.days) : null,
          )
        : Promise.resolve(null);

    void Promise.all([loadCurrent, loadPrev]).then(([current, prevTotal]) => {
      if (!active) return;
      setGatewaySamples(current.samples);
      setDailyRows(current.days);
      setPeriodSlots(current.slots);
      setLatest(current.latest);
      setPrevPeriodKwh(prevTotal);
      if (filterTouched.current || alignedFilter.current || !current.latest) return;
      const parts = vietnamFromStored(current.latest.at);
      alignedFilter.current = true;
      if (!parts || (timeFilter.mode === "month" && timeFilter.month === parts.monthKey)) return;
      setTimeFilter((currentFilter) => ({
        ...currentFilter,
        mode: "month",
        month: parts.monthKey,
        year: parts.year,
        date: parts.date,
      }));
    });

    return () => {
      active = false;
    };
  }, [project.id, timeFilter, meterPointIds]);

  const span = useMemo(() => timeFilterSpan(timeFilter), [timeFilter]);
  const energySeries = useMemo(
    () =>
      span.hourly
        ? energySeriesFromSamples(timeFilter, gatewaySamples)
        : energySeriesFromDaily(timeFilter, dailyRows),
    [span.hourly, timeFilter, gatewaySamples, dailyRows],
  );
  const consumptionTotal = energySeries.reduce((sum, item) => sum + item.kwh, 0);
  const showIndex =
    !span.hourly && dailyRows.length > 0 && consumptionTotal === 0;
  const chartSeries = useMemo(() => {
    if (!showIndex) {
      return energySeries.map((item) => ({
        day: item.day,
        kwh: item.kwh,
        hasSample: item.hasSample,
      }));
    }
    const periods = getTimeFilterPeriods(timeFilter);
    const indexKwh = periods.map(() => 0);
    const hasSample = periods.map(() => false);
    for (const row of dailyRows) {
      const index = periodIndexForInstant(timeFilter, `${row.day}T00:00:00`, periods.length);
      if (index < 0) continue;
      indexKwh[index] += effectiveRegisterKwh(Number(row.lastWh), Number(row.offsetKwh) || 0);
      hasSample[index] = true;
    }
    return periods.map((period, index) => ({
      day: period.label,
      kwh: indexKwh[index],
      hasSample: hasSample[index],
    }));
  }, [showIndex, energySeries, dailyRows, timeFilter]);
  const sampledValues = chartSeries.filter((item) => item.hasSample).map((item) => item.kwh);
  const energyMax = sampledValues.length ? Math.max(...sampledValues) : 0;
  const energyMin = sampledValues.length ? Math.min(...sampledValues) : 0;
  const periodCost = useMemo(() => monthlyCostFromSlots(periodSlots, touPrices), [periodSlots, touPrices]);
  const periodCostThousands = periodCost / 1000;
  const periodLabel = getTimeFilterLabel(timeFilter);
  const energyMom = useMemo(() => {
    if (timeFilter.mode !== "month" || prevPeriodKwh == null || !Number.isFinite(prevPeriodKwh)) return null;
    const delta = consumptionTotal - prevPeriodKwh;
    const pct = prevPeriodKwh > 0 ? (delta / prevPeriodKwh) * 100 : null;
    return { delta, pct, prev: prevPeriodKwh };
  }, [timeFilter.mode, consumptionTotal, prevPeriodKwh]);

  const energyMomCaption =
    energyMom == null
      ? dailyRows.length || gatewaySamples.length
        ? `Tổng ${periodLabel}: ${formatKwh(consumptionTotal)} kWh`
        : `Chưa có số liệu · ${periodLabel}`
      : energyMom.pct == null
        ? `Kỳ trước chưa có tiêu thụ · Kỳ này ${formatKwh(consumptionTotal)} kWh`
        : `${energyMom.delta >= 0 ? "Tăng" : "Giảm"} ${formatKwh(Math.abs(energyMom.delta))} kWh (${Math.abs(energyMom.pct).toFixed(1)}%) so với tháng trước (${formatKwh(energyMom.prev)} kWh)`;

  const co2Caption =
    co2 > 0
      ? `${ghgSourceCount} nguồn phát thải · Tổng ${co2.toLocaleString("vi-VN", {
          maximumFractionDigits: 2,
          minimumFractionDigits: 0,
        })} tấn CO₂e`
      : "Chưa có nguồn phát thải trong cấu hình GHG";

  return (
    <div className="mx-auto h-full max-w-[1480px] overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="mb-4 flex flex-col gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-bold tracking-tight text-slate-800 sm:text-[28px]">
            {project.customer}
          </h1>
          <p className="mt-1 text-[12px] text-slate-500 sm:text-[13px]">Kỳ xem: {periodLabel}</p>
        </div>
        <TimeFilterBar
          value={timeFilter}
          onChange={(next) => {
            filterTouched.current = true;
            setTimeFilter(next);
          }}
        />
      </div>

      <div className="grid gap-3 sm:gap-4 xl:grid-cols-3">
        <DashboardCard title="ĐIỆN NĂNG TIÊU THỤ" className="min-w-0 xl:col-span-2">
          <div className="mb-3 grid grid-cols-1 gap-1 text-sm sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-1">
            <p>
              Lớn nhất:{" "}
              <span className="font-semibold text-emerald-700">{formatKwh(energyMax)} kWh</span>
            </p>
            <p>
              Nhỏ nhất:{" "}
              <span className="font-semibold text-emerald-600">{formatKwh(energyMin)} kWh</span>
            </p>
            <p>
              Tổng tiêu thụ:{" "}
              <span className="font-semibold text-slate-800">{formatKwh(consumptionTotal)} kWh</span>
            </p>
            {showIndex ? (
              <p className="w-full text-[12px] text-amber-700">
                Công tơ không tăng trong kỳ — cột đang hiện chỉ số EPaed cuối kỳ để thấy các mốc có bản tin.
              </p>
            ) : null}
          </div>
          {latest ? <LatestReading sample={latest} /> : null}
          <EnergyChart data={chartSeries} />
          <p className="mt-2 break-words text-center text-[11px] leading-relaxed text-slate-500 sm:text-[12px]">
            {energyMomCaption}
            {energyMom && energyMom.pct != null ? (
              <span className={`ml-1 ${energyMom.delta <= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                {energyMom.delta <= 0 ? "↓" : "↑"}
              </span>
            ) : null}
          </p>
        </DashboardCard>

        <DashboardCard title="PHÁT THẢI CO2" className="min-w-0 overflow-hidden">
          <DonutChart
            color="#1e6b45"
            value={co2.toFixed(2)}
            unit="tấn CO2 tđ"
            caption={co2Caption}
          />
        </DashboardCard>
      </div>

      <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="CHI PHÍ" className="min-w-0 overflow-hidden">
          <DonutChart
            color="#1e5f8a"
            value={periodCostThousands.toLocaleString("vi-VN", {
              maximumFractionDigits: periodCostThousands > 0 && periodCostThousands < 10 ? 2 : 0,
            })}
            unit="nghìn VNĐ"
            caption={
              periodCost > 0
                ? `Tổng ${periodLabel}: ${formatVnd(periodCost)} VND (trước VAT)`
                : periodSlots.length > 0
                  ? `${periodLabel}: có bản tin nhưng EPaed không tăng → 0 VND`
                  : `Chưa có số liệu chi phí · ${periodLabel}`
            }
          />
        </DashboardCard>

        <DashboardCard title="TRẠNG THÁI THIẾT BỊ">
          <DeviceStatusChart items={deviceStatus} />
        </DashboardCard>

        <DashboardCard title="NHẬT KÝ CẢNH BÁO" className="lg:col-span-2">
          <AlertLogTable rows={alerts} />
        </DashboardCard>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-4 ${className}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h2 className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 sm:text-[12px]">
          {title}
        </h2>
        <button
          type="button"
          className="text-slate-300 hover:text-slate-500"
          aria-label="Phóng to"
        >
          <ExpandIcon className="h-4 w-4" />
        </button>
      </div>
      {children}
    </section>
  );
}

function LatestReading({ sample }: { sample: ProjectGatewaySample }) {
  const items: Array<[string, string]> = [];
  const add = (label: string, value: number | undefined, unit: string, digits: number) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return;
    items.push([label, `${formatReading(value, digits)} ${unit}`]);
  };
  add("Ua", sample.values.Van, "V", 1);
  add("Ub", sample.values.Vbn, "V", 1);
  add("Uc", sample.values.Vcn, "V", 1);
  add("F", sample.values.F, "Hz", 2);
  add("E", typeof sample.values.EPaed === "number" ? registerToKwh(sample.values.EPaed) : undefined, "kWh", 3);
  if (!items.length) return null;
  return (
    <p className="mb-3 text-xs text-slate-500">
      {items.map(([label, text]) => `${label} ${text}`).join(" · ")}
      {" · "}
      Cập nhật {formatStoredVietnam(sample.at) ?? sample.at}
    </p>
  );
}

function EnergyChart({ data }: { data: { day: string; kwh: number; hasSample?: boolean }[] }) {
  if (!data.length) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-slate-400 sm:h-[250px]">
        Chưa có dữ liệu
      </div>
    );
  }
  const max = Math.max(...data.map((item) => item.kwh), 0.001);
  const labelStep = data.length > 16 ? 5 : data.length > 10 ? 3 : 1;

  return (
    <div className="flex h-[200px] items-end gap-px overflow-hidden pb-1 sm:h-[250px] sm:gap-[2px]">
      {data.map((item, index) => {
        const heightPct = item.kwh > 0 ? Math.max((item.kwh / max) * 100, 4) : 0;
        const showLabel = index % labelStep === 0 || index === data.length - 1;
        return (
          <div key={`${item.day}-${index}`} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex h-[165px] w-full items-end justify-center sm:h-[210px]">
              {heightPct > 0 ? (
                <div
                  className="w-full max-w-[10px] rounded-t-sm bg-emerald-600 transition-all hover:bg-emerald-500"
                  style={{ height: `${heightPct}%` }}
                  title={`${item.day}: ${formatKwh(item.kwh)} kWh`}
                />
              ) : (
                <div
                  className={`h-[2px] w-full max-w-[10px] rounded-sm ${item.hasSample ? "bg-emerald-300" : "bg-slate-200"}`}
                  title={
                    item.hasSample
                      ? `${item.day}: có bản tin, sản lượng 0 kWh`
                      : `${item.day}: không có bản tin`
                  }
                />
              )}
            </div>
            <span
              className={`mt-1 max-w-full truncate text-[8px] leading-none text-slate-400 sm:text-[9px] ${
                showLabel ? "opacity-100" : "opacity-0 sm:opacity-100"
              }`}
            >
              {showLabel ? item.day : "·"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DeviceStatusChart({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 0);
  const yMax = Math.max(4, Math.ceil(maxValue / 4) * 4 || 4);
  const ticks = [yMax, Math.round((yMax * 2) / 3), Math.round(yMax / 3), 0];
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex h-[280px] flex-col gap-2 pt-2">
      <p className="text-[12px] text-slate-500">Tổng thiết bị dự án: {total}</p>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="flex h-[210px] flex-col justify-between py-0.5 text-[11px] text-slate-400">
          {ticks.map((tick) => (
            <span key={tick} className="leading-none">
              {tick}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-x-0 top-0 h-[210px]">
            {ticks.map((tick, i) => (
              <div
                key={`${tick}-${i}`}
                className="absolute inset-x-0 border-t border-slate-100"
                style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
              />
            ))}
          </div>
          <div className="relative flex h-[210px] items-end justify-around px-4">
            {items.map((item) => (
              <div key={item.label} className="flex h-full w-[28%] flex-col items-center justify-end">
                <span className="mb-1 text-sm font-semibold text-slate-700">{item.value}</span>
                <div
                  className="w-full max-w-[42px] rounded-t-md"
                  style={{
                    height: `${item.value > 0 ? Math.max((item.value / yMax) * 100, 6) : 0}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-around px-4">
            {items.map((item) => (
              <p
                key={item.label}
                className="w-[28%] text-center text-[10px] font-medium tracking-wide text-slate-400"
              >
                {item.label}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DonutChart({
  color,
  value,
  unit,
  caption,
}: {
  color: string;
  value: string;
  unit: string;
  caption: React.ReactNode;
}) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * 0.82;

  return (
    <div className="flex w-full min-w-0 flex-col items-center overflow-hidden pt-1">
      <div className="relative h-[160px] w-[160px] sm:h-[210px] sm:w-[210px]">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#edf0f3"
            strokeWidth="22"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="22"
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap="butt"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
          <p className="text-[22px] leading-none font-bold text-slate-800 sm:text-[26px]">{value}</p>
          <p className="mt-1.5 text-[11px] text-slate-400 sm:text-xs">{unit}</p>
        </div>
      </div>
      <p className="mt-1 max-w-full break-words px-1 text-center text-[11px] leading-relaxed text-slate-400 sm:text-[12px]">
        {caption}
      </p>
    </div>
  );
}

function AlertLogTable({ rows: sourceRows }: { rows: DashboardAlert[] }) {
  const [time, setTime] = useState("");
  const [point, setPoint] = useState("all");
  const [param, setParam] = useState("");
  const [value, setValue] = useState("");

  const rows = sourceRows.filter((row) => {
    const matchTime = !time || row.time.includes(time);
    const matchPoint = point === "all" || row.point === point;
    const matchParam =
      !param || row.param.toLowerCase().includes(param.toLowerCase());
    const matchValue = !value || row.value.includes(value);
    return matchTime && matchPoint && matchParam && matchValue;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[13px]">
        <thead>
          <tr className="text-[12px] font-medium text-slate-500">
            <th className="pb-2 font-medium">
              Thời gian <span className="text-slate-300">↕</span>
            </th>
            <th className="pb-2 font-medium">
              Điểm đo <span className="text-slate-300">↕</span>
            </th>
            <th className="pb-2 font-medium">
              Thông số <span className="text-slate-300">↕</span>
            </th>
            <th className="pb-2 font-medium">
              Giá trị <span className="text-slate-300">↕</span>
            </th>
          </tr>
          <tr className="text-slate-400">
            <th className="pb-2 pr-2 font-normal">
              <span className="relative block">
                <input
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-8 w-full rounded border border-slate-200 pr-7 pl-2 text-xs outline-none focus:border-emerald-500"
                />
                <FilterMark />
              </span>
            </th>
            <th className="pb-2 pr-2 font-normal">
              <span className="relative block">
                <select
                  value={point}
                  onChange={(e) => setPoint(e.target.value)}
                  className="h-8 w-full appearance-none rounded border border-slate-200 pr-7 pl-2 text-xs outline-none focus:border-emerald-500"
                >
                  <option value="all" />
                  {Array.from(new Set(sourceRows.map((row) => row.point))).map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <FilterMark />
              </span>
            </th>
            <th className="pb-2 pr-2 font-normal">
              <span className="relative block">
                <input
                  value={param}
                  onChange={(e) => setParam(e.target.value)}
                  className="h-8 w-full rounded border border-slate-200 pr-7 pl-2 text-xs outline-none focus:border-emerald-500"
                />
                <FilterMark />
              </span>
            </th>
            <th className="pb-2 font-normal">
              <span className="relative block">
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-8 w-full rounded border border-slate-200 pr-7 pl-2 text-xs outline-none focus:border-emerald-500"
                />
                <FilterMark />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-sm text-slate-400">
                {sourceRows.length === 0 ? "Chưa có nhật ký cảnh báo trong dự án" : "Không khớp bộ lọc"}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 text-slate-600">
                <td className="py-2.5 whitespace-nowrap">{row.time}</td>
                <td className="py-2.5">{row.point}</td>
                <td className="py-2.5">
                  <button type="button" className="text-emerald-600 hover:underline">
                    {row.param}
                  </button>
                </td>
                <td className="py-2.5">{row.value}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function FilterMark() {
  return (
    <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-slate-300">
      ▾
    </span>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M20 15v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
