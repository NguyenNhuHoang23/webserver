"use client";

import { useMemo, useState } from "react";

const N = 160;
const T0 = Date.parse("2026-01-27T09:40:00");
const AGGS = ["MAX", "AVG", "MIN"] as const;
const COLORS: Record<(typeof AGGS)[number], string> = {
  MAX: "#0d47a1",
  AVG: "#1e88e5",
  MIN: "#90caf9",
};

type Agg = (typeof AGGS)[number];
type Series = { key: string; name: string; color: string; values: number[] };

function toggleIn<T>(list: T[], value: T) {
  if (list.includes(value)) return list.length === 1 ? list : list.filter((item) => item !== value);
  return [...list, value];
}

function timeLabel(index: number, kind: "full" | "min" | "sec") {
  const d = new Date(T0 + (index / (N - 1)) * 240000);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (kind === "full") return `1-27(Tue) ${hh}:${mm}`;
  if (kind === "min") return `${hh}:${mm}`;
  return "30";
}

function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function uUnb(i: number, qty: string, agg: Agg, seed: number) {
  const t = (i / (N - 1)) * 240;
  const shift = qty === "Uneg" ? 0.4 : qty === "Uzero" ? 0.9 : 0;
  let v =
    0.48 +
    0.07 * Math.sin(t / 42 + seed * 0.2 + shift) +
    0.03 * Math.sin(t / 14 + shift);
  if (agg === "MAX") v += 0.16;
  if (agg === "MIN") v -= 0.12;
  return Math.max(0, Math.min(2, v));
}

function iUnb(i: number, qty: string, agg: Agg, seed: number) {
  const t = (i / (N - 1)) * 240;
  const shift = qty === "Ineg" ? 0.5 : qty === "Izero" ? 1.1 : 0;
  const trend = 1.45 + (t / 240) * 2.85;
  let v =
    trend +
    0.38 * Math.sin(t / 18 + seed * 0.18 + shift) +
    0.22 * Math.sin(t / 8 + shift) +
    0.45 * Math.max(0, Math.sin(t / 28 + shift) ** 3);
  if (agg === "MAX") v += 0.35;
  if (agg === "MIN") v -= 0.35;
  return Math.max(1, Math.min(5, v));
}

export function UnbalanceChart({ seed }: { seed: number }) {
  const [topQty, setTopQty] = useState("Uunb");
  const [botQty, setBotQty] = useState("Iunb");
  const [slot, setSlot] = useState("-");
  const [aggs, setAggs] = useState<Agg[]>(["AVG"]);
  const [hover, setHover] = useState<number | null>(null);
  const [viewWin, setViewWin] = useState({ start: 0, end: N - 1 });
  const [crosshair, setCrosshair] = useState(true);

  const uSeries = useMemo<Series[]>(
    () =>
      aggs.map((agg) => ({
        key: `u-${agg}`,
        name: `${topQty} ${agg}`,
        color: COLORS[agg],
        values: Array.from({ length: N }, (_, i) => uUnb(i, topQty, agg, seed)),
      })),
    [aggs, topQty, seed],
  );

  const iSeries = useMemo<Series[]>(
    () =>
      aggs.map((agg) => ({
        key: `i-${agg}`,
        name: `${botQty} ${agg}`,
        color: COLORS[agg],
        values: Array.from({ length: N }, (_, i) => iUnb(i, botQty, agg, seed)),
      })),
    [aggs, botQty, seed],
  );

  const span = viewWin.end - viewWin.start;
  const zoomIn = () => {
    const next = Math.max(32, Math.floor(span * 0.7));
    const mid = Math.floor((viewWin.start + viewWin.end) / 2);
    const start = Math.max(0, mid - Math.floor(next / 2));
    setViewWin({ start, end: Math.min(N - 1, start + next) });
  };
  const zoomOut = () => {
    const next = Math.min(N - 1, Math.floor(span / 0.7));
    const mid = Math.floor((viewWin.start + viewWin.end) / 2);
    const start = Math.max(0, mid - Math.floor(next / 2));
    setViewWin({ start, end: Math.min(N - 1, start + next) });
  };

  const left = (viewWin.start / (N - 1)) * 100;
  const width = ((viewWin.end - viewWin.start) / (N - 1)) * 100;

  return (
    <section className="mt-4 rounded-lg border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={topQty}
            onChange={(e) => setTopQty(e.target.value)}
            className="h-8 rounded border border-slate-300 bg-white px-2 text-[13px] text-slate-700"
          >
            <option>Uunb</option>
            <option>Uneg</option>
            <option>Uzero</option>
          </select>
          <select
            value={botQty}
            onChange={(e) => setBotQty(e.target.value)}
            className="h-8 rounded border border-slate-300 bg-white px-2 text-[13px] text-slate-700"
          >
            <option>Iunb</option>
            <option>Ineg</option>
            <option>Izero</option>
          </select>
          <select
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            className="h-8 w-14 rounded border border-slate-300 bg-white px-1 text-[13px] text-slate-500"
          >
            <option value="-">-</option>
          </select>
        </div>
        <div className="flex items-center gap-3 rounded border border-slate-200 px-2.5 py-1 text-[12px] text-slate-600">
          {AGGS.map((agg) => (
            <label key={agg} className="inline-flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                checked={aggs.includes(agg)}
                onChange={() => setAggs((list) => toggleIn(list, agg))}
                className="accent-[#1a73e8]"
              />
              {agg}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-stretch gap-3">
        <div className="min-w-0 flex-1 overflow-hidden rounded-[2px] border border-slate-400 bg-white">
          <div className="relative h-4 border-b border-slate-300 bg-slate-50">
            <div
              className="absolute inset-y-0 bg-[#d7e2ef]"
              style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
            />
            <input
              type="range"
              min={0}
              max={N - 21}
              value={viewWin.start}
              onChange={(e) => {
                const next = Number(e.target.value);
                setViewWin({ start: next, end: Math.min(N - 1, next + span) });
              }}
              className="absolute inset-0 z-10 w-full cursor-ew-resize appearance-none bg-transparent"
            />
            <span
              className="pointer-events-none absolute -top-px text-[10px] leading-none text-[#1a73e8]"
              style={{ left: `calc(${left}% - 5px)` }}
            >
              ▼
            </span>
            <span
              className="pointer-events-none absolute -bottom-px text-[10px] leading-none text-slate-400"
              style={{ left: `calc(${left + width}% - 5px)` }}
            >
              ▲
            </span>
          </div>
          <UnbPane
            title={`${topQty} [%]`}
            series={uSeries}
            viewWin={viewWin}
            hover={crosshair ? hover : null}
            onHover={setHover}
            domain={[0, 2]}
            ticks={[0, 0.5, 1, 1.5, 2]}
            formatTick={(v) => (v === 0 ? "0" : v.toFixed(1))}
          />
          <div className="h-px bg-slate-400" />
          <UnbPane
            title={`${botQty} [%]`}
            series={iSeries}
            viewWin={viewWin}
            hover={crosshair ? hover : null}
            onHover={setHover}
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            formatTick={(v) => String(v)}
            axis
          />
        </div>
        <div className="flex w-[118px] shrink-0 flex-col justify-around py-8 text-[11px] leading-5">
          <Legend series={uSeries} hover={crosshair ? hover : null} />
          <Legend series={iSeries} hover={crosshair ? hover : null} />
        </div>
      </div>

      <div className="mt-2 flex w-[68px] flex-wrap gap-1">
        <ToolBtn label="Phóng to" onClick={zoomIn}>
          <ZoomIcon plus />
        </ToolBtn>
        <ToolBtn label="Thu nhỏ" onClick={zoomOut}>
          <ZoomIcon plus={false} />
        </ToolBtn>
        <ToolBtn label="Vừa khung" onClick={() => setViewWin({ start: 0, end: N - 1 })}>
          <FitIcon />
        </ToolBtn>
        <ToolBtn label="Con trỏ" active={crosshair} onClick={() => setCrosshair((v) => !v)}>
          <CursorIcon />
        </ToolBtn>
      </div>
    </section>
  );
}

function UnbPane({
  title,
  series,
  viewWin,
  hover,
  onHover,
  domain,
  ticks,
  formatTick,
  axis = false,
}: {
  title: string;
  series: Series[];
  viewWin: { start: number; end: number };
  hover: number | null;
  onHover: (index: number | null) => void;
  domain: [number, number];
  ticks: number[];
  formatTick: (value: number) => string;
  axis?: boolean;
}) {
  const W = 820;
  const H = 240;
  const pad = { l: 52, r: 10, t: 12, b: axis ? 40 : 12 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const [yMin, yMax] = domain;
  const xAt = (i: number) =>
    pad.l + ((i - viewWin.start) / Math.max(1, viewWin.end - viewWin.start)) * innerW;
  const yAt = (v: number) => pad.t + ((yMax - v) / (yMax - yMin || 1)) * innerH;

  const timeTicks: { i: number; kind: "full" | "min" | "sec" }[] = [];
  if (axis) {
    for (let i = viewWin.start; i <= viewWin.end; i++) {
      const sec = Math.round((i / (N - 1)) * 240);
      if (sec % 60 === 0) timeTicks.push({ i, kind: i === viewWin.start ? "full" : "min" });
      else if (sec % 30 === 0) timeTicks.push({ i, kind: "sec" });
    }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-[240px] w-full"
      onMouseLeave={() => onHover(null)}
      onMouseMove={(e) => {
        const box = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - box.left) / box.width) * W;
        const t = (x - pad.l) / innerW;
        const i = Math.round(viewWin.start + t * (viewWin.end - viewWin.start));
        onHover(Math.max(viewWin.start, Math.min(viewWin.end, i)));
      }}
    >
      <rect x={pad.l} y={pad.t} width={innerW} height={innerH} fill="white" stroke="#6b7280" />
      <text x="14" y={H / 2} className="fill-slate-600" fontSize="12" transform={`rotate(-90 14 ${H / 2})`}>
        {title}
      </text>
      {ticks.map((v) => {
        const y = yAt(v);
        return (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#e5e7eb" />
            <text x={pad.l - 6} y={y + 3} textAnchor="end" className="fill-slate-500" fontSize="10">
              {formatTick(v)}
            </text>
          </g>
        );
      })}
      {Array.from({ length: 9 }, (_, n) => {
        const i = viewWin.start + ((viewWin.end - viewWin.start) * n) / 8;
        return <line key={n} x1={xAt(i)} x2={xAt(i)} y1={pad.t} y2={H - pad.b} stroke="#eef0f2" />;
      })}
      {series.map((s) => {
        const pts: [number, number][] = [];
        for (let i = viewWin.start; i <= viewWin.end; i++) pts.push([xAt(i), yAt(s.values[i])]);
        return (
          <path
            key={s.key}
            d={smoothPath(pts)}
            fill="none"
            stroke={s.color}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
      {hover != null ? (
        <line x1={xAt(hover)} x2={xAt(hover)} y1={pad.t} y2={H - pad.b} stroke="#94a3b8" strokeDasharray="3 3" />
      ) : null}
      {timeTicks.map((tick) => (
        <text
          key={`${tick.i}-${tick.kind}`}
          x={xAt(tick.i)}
          y={tick.kind === "sec" ? H - 26 : H - 10}
          textAnchor="middle"
          className={tick.kind === "sec" ? "fill-slate-400" : "fill-slate-600"}
          fontSize={tick.kind === "sec" ? 9 : 10}
        >
          {timeLabel(tick.i, tick.kind)}
        </text>
      ))}
    </svg>
  );
}

function Legend({ series, hover }: { series: Series[]; hover: number | null }) {
  return (
    <ul>
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="h-0.5 w-5" style={{ backgroundColor: s.color }} />
          <span style={{ color: s.color }}>{s.name}</span>
        </li>
      ))}
      {hover != null
        ? series.map((s) => (
            <li key={`${s.key}-v`} className="pl-[26px] text-slate-500">
              {s.values[hover].toFixed(3)}
            </li>
          ))
        : null}
    </ul>
  );
}

function ToolBtn({
  children,
  label,
  onClick,
  active = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-sm border text-slate-500 ${
        active ? "border-[#1a73e8] bg-blue-50 text-[#1a73e8]" : "border-slate-300 bg-white hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function ZoomIcon({ plus }: { plus: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <circle cx="10.5" cy="10.5" r="5.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m15 15 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d={plus ? "M10.5 8v5M8 10.5h5" : "M8 10.5h5"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FitIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path d="M8 5H5v3M16 5h3v3M8 19H5v-3M16 19h3v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CursorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
