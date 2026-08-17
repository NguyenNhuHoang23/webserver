"use client";

import { useMemo, useRef, useState } from "react";
import { FrequencyChart } from "@/components/client/FrequencyChart";
import { HarmonicsChart } from "@/components/client/HarmonicsChart";
import { PowerChart } from "@/components/client/PowerChart";
import { UiWaveform } from "@/components/client/UiWaveform";
import { UnbalanceChart } from "@/components/client/UnbalanceChart";

type EnergyKind = "Điện" | "Nhiệt" | "Khí nén" | "Nước";
type Resolution = "Phút" | "Giờ" | "Ngày" | "Tuần" | "Tháng" | "Năm";
type DataKind = "avg" | "max" | "min" | "instant";
type MetricId = "energy" | "ui" | "freq" | "power" | "harm" | "unbalance" | "pst";
type ViewMode = "chart" | "table";

const RESOLUTIONS: Resolution[] = ["Phút", "Giờ", "Ngày", "Tuần", "Tháng", "Năm"];
const ENERGY_KINDS: { id: EnergyKind; icon: "bolt" | "heat" | "air" | "water" }[] = [
  { id: "Điện", icon: "bolt" },
  { id: "Nhiệt", icon: "heat" },
  { id: "Khí nén", icon: "air" },
  { id: "Nước", icon: "water" },
];
const METRICS: { id: MetricId; label: string }[] = [
  { id: "energy", label: "Energy" },
  { id: "ui", label: "U / I" },
  { id: "freq", label: "Tần số" },
  { id: "power", label: "Công suất" },
  { id: "harm", label: "Sóng hài" },
  { id: "unbalance", label: "Mất cân bằng pha" },
  { id: "pst", label: "Pst/Plt" },
];
const SERIES = [
  { id: "p1", name: "Điểm đo 1", color: "#3b82f6" },
  { id: "p2", name: "Điểm đo 2", color: "#22c55e" },
  { id: "p3", name: "Điểm đo 3", color: "#a16207" },
];

type BarPoint = { minute: number; label: string; kwh: number };

function officeBars(seed: number): BarPoint[] {
  const points: BarPoint[] = [];
  for (let minute = 0; minute < 24 * 60; minute += 15) {
    const hour = minute / 60;
    let kwh = 1.15 + 0.22 * Math.sin(hour * 0.9 + seed * 0.4);

    if (hour >= 6 && hour <= 10) {
      const p = (hour - 6) / 4;
      kwh = 1.35 + 4.5 * Math.sin(p * Math.PI);
    } else if (hour > 10 && hour < 12.5) {
      kwh = 1.5 + 0.9 * Math.abs(Math.sin(hour * 2.2 + seed));
    } else if (hour >= 12.5 && hour < 14) {
      kwh = hour > 13 && hour < 13.4 ? 0 : 0.9 + 0.45 * Math.sin(hour);
    } else if (hour >= 14) {
      kwh = 0.7 + 0.35 * Math.abs(Math.sin(hour * 1.3 + seed));
    }

    if (hour < 4) kwh = Math.max(0.9, kwh);

    points.push({
      minute,
      label: `${String(Math.floor(hour)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
      kwh: Number(Math.max(0, Math.min(6.2, kwh)).toFixed(2)),
    });
  }
  return points;
}

function seriesFor(metric: MetricId, seed: number): number[][] {
  const wave = (base: number, amp: number, shift: number, n: number) =>
    Array.from({ length: 25 }, (_, h) => {
      const t = (h + shift) / 24;
      return (
        base +
        amp * Math.sin(t * Math.PI * 2) +
        amp * 0.35 * Math.sin(t * Math.PI * 4 + seed) +
        (h > 8 && h < 15 ? amp * 0.25 : 0) -
        (h < 5 ? amp * 0.2 : 0)
      );
    });

  if (metric === "freq") {
    return [wave(50.02, 0.08, 0, seed), wave(49.98, 0.06, 1, seed), wave(50.01, 0.05, 2, seed)];
  }
  if (metric === "ui") {
    return [wave(398, 12, 0, seed), wave(401, 9, 1.5, seed), wave(395, 14, 2.2, seed)];
  }
  if (metric === "power") {
    return [wave(180, 55, 0, seed), wave(140, 48, 1, seed), wave(120, 40, 2, seed)];
  }
  return [wave(165, 52, 0, seed), wave(148, 58, 1.2, seed), wave(132, 46, 2.1, seed)];
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
  const [hierarchy, setHierarchy] = useState("meter");
  const [from, setFrom] = useState("2026-07-19");
  const [to, setTo] = useState("2026-07-19");
  const [resolution, setResolution] = useState<Resolution>("Giờ");
  const [dataKind, setDataKind] = useState<DataKind>("avg");
  const [energy, setEnergy] = useState<EnergyKind>("Điện");
  const [metric, setMetric] = useState<MetricId>("energy");
  const [view, setView] = useState<ViewMode>("chart");
  const [seed, setSeed] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState<number | null>(null);
  const [showSum, setShowSum] = useState(false);
  const [range, setRange] = useState({ start: 8, end: 56 });

  const [applied, setApplied] = useState({
    hierarchy,
    from,
    to,
    resolution,
    dataKind,
    seed,
  });

  const values = useMemo(
    () =>
      seriesFor(
        metric,
        seed + (applied.dataKind === "max" ? 0.4 : applied.dataKind === "min" ? -0.3 : 0),
      ),
    [metric, seed, applied.dataKind],
  );
  const bars = useMemo(() => officeBars(seed), [seed]);
  const isEnergyChart = energy === "Điện" && metric === "energy";
  const isUiChart = metric === "ui";
  const isFreqChart = metric === "freq";
  const isPowerChart = metric === "power";
  const isHarmChart = metric === "harm";
  const isUnbChart = metric === "unbalance";
  const meta = metricMeta(energy, metric);
  const yMax = isEnergyChart ? 7 : Math.max(...values.flat()) * 1.08;
  const yMin = isEnergyChart ? 0 : Math.min(0, Math.min(...values.flat()) * 0.92);

  const visibleBars = bars.slice(range.start, range.end + 1);
  const barSum = visibleBars.reduce((s, p) => s + p.kwh, 0);

  const totals = useMemo(() => {
    if (isEnergyChart) {
      const sum = bars.reduce((s, p) => s + p.kwh, 0);
      return {
        total: sum.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ","),
        peak: Math.max(...bars.map((p) => p.kwh)).toFixed(1),
        pf: "0.94",
      };
    }
    const sum = values[0].reduce((a, b, i) => a + b + values[1][i] + values[2][i], 0);
    return {
      total: (sum / 3).toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ","),
      peak: Math.max(...values.flat()).toFixed(1),
      pf: "0.94",
    };
  }, [values, bars, isEnergyChart]);

  return (
    <div className="flex h-full min-h-0 bg-[#f4f6f9]">
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-4">
          <FunnelIcon className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Bộ lọc nâng cao</h2>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
          <Field label="PHÂN CẤP HỆ THỐNG">
            <select
              value={hierarchy}
              onChange={(e) => setHierarchy(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#1a73e8]"
            >
              <option value="meter">Điểm đo (Meter)</option>
              <option value="cabinet">Tủ điện</option>
              <option value="area">Khu vực</option>
            </select>
          </Field>

          <Field label="KHOẢNG THỜI GIAN">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-slate-400">
                Từ
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-2 text-sm text-slate-700 outline-none focus:border-[#1a73e8]"
                />
              </label>
              <label className="text-[11px] text-slate-400">
                Đến
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-2 text-sm text-slate-700 outline-none focus:border-[#1a73e8]"
                />
              </label>
            </div>
          </Field>

          <Field label="ĐỘ PHÂN GIẢI">
            <div className="grid grid-cols-3 gap-1.5">
              {RESOLUTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setResolution(item)}
                  className={`h-8 rounded-md text-[12px] font-medium ${
                    resolution === item
                      ? "bg-[#1a73e8] text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </Field>

          <Field label="LOẠI DỮ LIỆU">
            <div className="space-y-2.5">
              {(
                [
                  ["avg", "Trung bình"],
                  ["max", "Lớn nhất"],
                  ["min", "Nhỏ nhất"],
                  ["instant", "Tức thời"],
                ] as const
              ).map(([id, label]) => (
                <label key={id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="radio"
                    name="data-kind"
                    checked={dataKind === id}
                    onChange={() => setDataKind(id)}
                    className="accent-[#1a73e8]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </Field>

          <button
            type="button"
            onClick={() => {
              setApplied({
                hierarchy,
                from,
                to,
                resolution,
                dataKind,
                seed: seed + 1,
              });
              setSeed((n) => n + 1);
            }}
            className="mt-auto h-11 w-full rounded-md bg-[#1e4f8a] text-[13px] font-bold tracking-wide text-white hover:bg-[#173f6e]"
          >
            ÁP DỤNG BỘ LỌC
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-5">
        <div className="flex flex-wrap gap-2">
          {ENERGY_KINDS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setEnergy(item.id)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium ${
                energy === item.id
                  ? "border-[#1a73e8] bg-[#1a73e8] text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              <EnergyGlyph type={item.icon} className="h-4 w-4" />
              {item.id}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {METRICS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMetric(item.id)}
              className={`h-8 rounded-full px-3 text-[12px] font-medium ${
                metric === item.id
                  ? "bg-[#1a73e8] text-white"
                  : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {isUiChart ? (
          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:p-4">
            <UiWaveform />
          </section>
        ) : isFreqChart ? (
          <FrequencyChart seed={seed} onRefresh={() => setSeed((n) => n + 1)} />
        ) : isPowerChart ? (
          <PowerChart seed={seed} />
        ) : isHarmChart ? (
          <HarmonicsChart seed={seed} />
        ) : isUnbChart ? (
          <UnbalanceChart seed={seed} />
        ) : (
        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="relative">
            <h1 className="text-center text-[16px] font-semibold text-slate-800">
              {isEnergyChart ? "Chi tiết tiêu thụ điện năng" : meta.title}
            </h1>
            <div className="absolute top-0 right-0 flex items-center gap-0.5">
              <IconBtn label="Biểu đồ cột" active={view === "chart"} onClick={() => setView("chart")}>
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

          {isEnergyChart ? (
            <div className="mt-3 flex items-center justify-center gap-2 text-[13px] text-slate-600">
              <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#4f89d8]" />
              (DB-OFF1) Tủ điện văn phòng
              {showSum ? (
                <span className="ml-2 text-[12px] font-medium text-[#1a73e8]">
                  Σ {barSum.toFixed(1)} kWh
                </span>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-center gap-4 text-[12px] text-slate-500">
              {SERIES.map((item) => (
                <span key={item.id} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
              ))}
            </div>
          )}

          {view === "chart" ? (
            isEnergyChart ? (
              <ConsumptionBarChart
                points={bars}
                range={range}
                onRange={setRange}
                hover={hover}
                onHover={setHover}
              />
            ) : (
              <div className="relative mt-2">
                <LineChart
                  values={values}
                  colors={SERIES.map((s) => s.color)}
                  names={SERIES.map((s) => s.name)}
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
            )
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] text-slate-400">
                    <th className="py-2 font-medium">Thời điểm</th>
                    {isEnergyChart ? (
                      <th className="py-2 font-medium">(DB-OFF1) Tủ điện văn phòng</th>
                    ) : (
                      SERIES.map((s) => (
                        <th key={s.id} className="py-2 font-medium" style={{ color: s.color }}>
                          {s.name}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {isEnergyChart
                    ? visibleBars.map((point) => (
                        <tr key={point.minute} className="border-b border-slate-50 text-slate-600">
                          <td className="py-1.5">{point.label}</td>
                          <td className="py-1.5">{point.kwh.toFixed(2)} kWh</td>
                        </tr>
                      ))
                    : Array.from({ length: 25 }, (_, i) => (
                        <tr key={i} className="border-b border-slate-50 text-slate-600">
                          <td className="py-1.5">{String(i).padStart(2, "0")}:00</td>
                          {values.map((row, s) => (
                            <td key={s} className="py-1.5">
                              {row[i].toFixed(1)}
                            </td>
                          ))}
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        )}

        {isUiChart || isFreqChart || isPowerChart || isHarmChart || isUnbChart ? null : (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <StatCard label="TỔNG TIÊU THỤ (3 ĐIỂM)" value={totals.total} unit="kWh" color="text-[#1a73e8]" />
              <StatCard label="CÔNG SUẤT ĐỈNH" value={totals.peak} unit="kW" color="text-red-500" />
              <StatCard label="HỆ SỐ CÔNG SUẤT TB" value={totals.pf} unit="cosφ" color="text-emerald-600" />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-slate-500">
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
          </>
        )}
      </div>
    </div>
  );
}

function ConsumptionBarChart({
  points,
  range,
  onRange,
  hover,
  onHover,
}: {
  points: BarPoint[];
  range: { start: number; end: number };
  onRange: (range: { start: number; end: number }) => void;
  hover: number | null;
  onHover: (index: number | null) => void;
}) {
  const W = 980;
  const H = 360;
  const pad = { l: 42, r: 16, t: 28, b: 32 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const visible = points.slice(range.start, range.end + 1);
  const yMax = 7;
  const yAt = (v: number) => pad.t + ((yMax - v) / yMax) * innerH;
  const barW = innerW / Math.max(visible.length, 1);
  const ticks: number[] = [];
  const startHour = Math.ceil(points[range.start].minute / 120) * 2;
  const endHour = Math.floor(points[range.end].minute / 60);
  for (let h = startHour; h <= endHour; h += 2) ticks.push(h);

  return (
    <div className="mt-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[360px] w-full"
        onMouseLeave={() => onHover(null)}
      >
        <text x={pad.l} y="16" className="fill-slate-400" fontSize="12">
          (kWh)
        </text>
        {Array.from({ length: 8 }, (_, i) => {
          const y = yAt(i);
          return (
            <g key={i}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#eceff3" />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" className="fill-slate-400" fontSize="11">
                {i}
              </text>
            </g>
          );
        })}
        {visible.map((point, i) => {
          const globalIndex = range.start + i;
          const x = pad.l + i * barW + barW * 0.18;
          const h = innerH - (yAt(point.kwh) - pad.t);
          return (
            <rect
              key={point.minute}
              x={x}
              y={yAt(point.kwh)}
              width={Math.max(1.5, barW * 0.64)}
              height={Math.max(0, h)}
              fill={hover === globalIndex ? "#3b74c4" : "#4f89d8"}
              onMouseEnter={() => onHover(globalIndex)}
            />
          );
        })}
        {ticks.map((hour) => {
          const minute = hour * 60;
          const idx = visible.findIndex((p) => p.minute === minute);
          if (idx < 0) return null;
          return (
            <text
              key={hour}
              x={pad.l + idx * barW + barW / 2}
              y={H - 10}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize="11"
            >
              {`${String(hour).padStart(2, "0")}:00`}
            </text>
          );
        })}
        {hover != null && hover >= range.start && hover <= range.end ? (
          <g
            transform={`translate(${Math.min(
              pad.l + (hover - range.start) * barW + 10,
              W - 140,
            )}, ${pad.t + 8})`}
          >
            <rect width="128" height="44" rx="4" fill="white" stroke="#e2e8f0" />
            <text x="10" y="18" className="fill-slate-500" fontSize="11">
              {points[hover].label}
            </text>
            <text x="10" y="34" className="fill-slate-700" fontSize="12" fontWeight="600">
              {points[hover].kwh.toFixed(2)} kWh
            </text>
          </g>
        ) : null}
      </svg>
      <DataZoom points={points} range={range} onRange={onRange} />
    </div>
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
            <rect width="158" height="78" rx="6" fill="white" stroke="#e2e8f0" />
            <text x="10" y="18" className="fill-slate-500" fontSize="11">
              {hover === 24 ? "23:59" : `${String(hover).padStart(2, "0")}:00`}
            </text>
            {SERIES.map((s, i) => (
              <text key={s.id} x="10" y={36 + i * 14} fontSize="11" fill={s.color}>
                {s.name}: {values[i][hover].toFixed(1)}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-slate-400">{label}</p>
      {children}
    </div>
  );
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
  type: "bolt" | "heat" | "air" | "water";
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
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 4.5 13.5h6.2L9.2 22 19.5 10h-6.2L13 2Z" />
    </svg>
  );
}

function FunnelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16l-6 7v5l-4 2v-7L4 6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
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
