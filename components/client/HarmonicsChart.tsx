"use client";

import { useMemo, useState } from "react";

const N = 160;
const T0 = Date.parse("2026-01-27T09:40:00");
const CHANNELS = [1, 2, 3] as const;
const AGGS = ["MAX", "AVG", "MIN"] as const;
const MODES = ["Level", "%fnd", "Phase(AVG)"] as const;
const ORDERS = [3, 5, 7, 9, 11, 13] as const;
const PHASES = [
  { ch: 1, u: "U12", i: "I1", color: "#e53935", dark: "#9b1c1c" },
  { ch: 2, u: "U23", i: "I2", color: "#43a047", dark: "#1b5e20" },
  { ch: 3, u: "U31", i: "I3", color: "#1e88e5", dark: "#0d47a1" },
] as const;

type Channel = (typeof CHANNELS)[number];
type Agg = (typeof AGGS)[number];
type Mode = (typeof MODES)[number];
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

function thdWave(i: number, ch: Channel, agg: Agg, seed: number) {
  const t = (i / (N - 1)) * 240;
  const phase = ch * 0.85;
  let v =
    3.78 +
    (ch - 1) * 0.07 +
    0.07 * Math.sin(t / 48 + phase + seed * 0.2) +
    0.025 * Math.sin(t / 16 + phase);
  if (agg === "MAX") v += 0.05;
  if (agg === "MIN") v -= 0.05;
  return v;
}

function uHarmWave(i: number, ch: Channel, order: number, agg: Agg, seed: number, mode: Mode) {
  const t = (i / (N - 1)) * 240;
  const phase = ch * 0.55 + order * 0.18;
  const base =
    order === 5 ? 14.35 : order === 3 ? 11.8 : order === 7 ? 2.15 : Math.max(0.6, 1.8 - (order - 9) * 0.18);
  let v =
    base +
    0.32 * Math.sin(t / 42 + phase + seed * 0.15) +
    0.16 * Math.sin(t / 14 + phase * 0.7);
  if (agg === "MAX") v += 0.35;
  if (agg === "MIN") v -= 0.35;
  if (mode === "%fnd") return Number((v / 3.9).toFixed(3));
  if (mode === "Phase(AVG)") return (ch - 2) * 118 + 6 * Math.sin(t / 36 + phase);
  return Math.max(0, v);
}

function iHarmWave(i: number, ch: Channel, order: number, agg: Agg, seed: number, mode: Mode) {
  const t = (i / (N - 1)) * 240;
  const phase = ch * 0.9 + order * 0.25;
  const base = order === 5 ? 24 : order === 3 ? 18 : order === 7 ? 13 : 8 - (order - 9) * 0.6;
  let v =
    base +
    8 * Math.sin(t / 16 + phase + seed * 0.2) +
    10 * Math.max(0, Math.sin(t / 22 + phase) ** 5) +
    4.5 * Math.sin(t * 0.55 + phase * 1.4);
  if (agg === "MAX") v *= 1.12;
  if (agg === "MIN") v *= 0.82;
  if (mode === "%fnd") return Number(Math.max(0, v / 6.2).toFixed(3));
  if (mode === "Phase(AVG)") return (ch - 2) * 110 + 14 * Math.sin(t / 20 + phase);
  return Math.max(0.4, v);
}

function orderColor(phase: (typeof PHASES)[number], order: number) {
  return order <= 5 ? phase.color : phase.dark;
}

function harmDomain(mode: Mode, kind: "u" | "i"): { domain: [number, number]; ticks: number[]; unit: string } {
  if (mode === "Phase(AVG)") return { domain: [-180, 180], ticks: [-180, -90, 0, 90, 180], unit: "[deg]" };
  if (mode === "%fnd") {
    return kind === "u"
      ? { domain: [0, 5], ticks: [0, 1, 2, 3, 4, 5], unit: "[%]" }
      : { domain: [0, 8], ticks: [0, 2, 4, 6, 8], unit: "[%]" };
  }
  return kind === "u"
    ? { domain: [0, 15], ticks: [0, 5, 10, 15], unit: "[V]" }
    : { domain: [0, 40], ticks: [0, 10, 20, 30, 40], unit: "[A]" };
}

export function HarmonicsChart({ seed }: { seed: number }) {
  const [tab, setTab] = useState<"trend" | "peak">("trend");
  const [thdQty, setThdQty] = useState("U thd-f");
  const [uQty, setUQty] = useState("U harm");
  const [iQty, setIQty] = useState("I harm");
  const [thdCh, setThdCh] = useState<Channel[]>([1, 2, 3]);
  const [uCh, setUCh] = useState<Channel[]>([1, 2, 3]);
  const [iCh, setICh] = useState<Channel[]>([1, 2, 3]);
  const [uMode, setUMode] = useState<Mode>("Level");
  const [iMode, setIMode] = useState<Mode>("Level");
  const [aggs, setAggs] = useState<Agg[]>(["AVG"]);
  const [orders, setOrders] = useState<number[]>([5, 7]);
  const [orderOpen, setOrderOpen] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [viewWin, setViewWin] = useState({ start: 0, end: N - 1 });
  const [crosshair, setCrosshair] = useState(true);

  const thdSeries = useMemo<Series[]>(
    () =>
      thdCh.flatMap((ch) => {
        const phase = PHASES[ch - 1];
        return aggs.map((agg) => ({
          key: `thd-${ch}-${agg}`,
          name: `${phase.u} thd-f ${agg}`,
          color: phase.color,
          values: Array.from({ length: N }, (_, i) => thdWave(i, ch, agg, seed)),
        }));
      }),
    [thdCh, aggs, seed],
  );

  const uSeries = useMemo<Series[]>(
    () =>
      uCh.flatMap((ch) => {
        const phase = PHASES[ch - 1];
        return orders.flatMap((order) =>
          aggs.map((agg) => ({
            key: `uh-${ch}-${order}-${agg}`,
            name: `${phase.u} H${order} ${agg}`,
            color: orderColor(phase, order),
            values: Array.from({ length: N }, (_, i) => uHarmWave(i, ch, order, agg, seed, uMode)),
          })),
        );
      }),
    [uCh, orders, aggs, seed, uMode],
  );

  const iSeries = useMemo<Series[]>(
    () =>
      iCh.flatMap((ch) => {
        const phase = PHASES[ch - 1];
        return orders.flatMap((order) =>
          aggs.map((agg) => ({
            key: `ih-${ch}-${order}-${agg}`,
            name: `${phase.i} H${order} ${agg}`,
            color: orderColor(phase, order),
            values: Array.from({ length: N }, (_, i) => iHarmWave(i, ch, order, agg, seed, iMode)),
          })),
        );
      }),
    [iCh, orders, aggs, seed, iMode],
  );

  const legend = [...thdSeries, ...uSeries, ...iSeries];
  const uScale = harmDomain(uMode, "u");
  const iScale = harmDomain(iMode, "i");

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
      <div className="mb-2.5 inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-[12px] font-medium shadow-2xs">
        <button
          type="button"
          onClick={() => setTab("trend")}
          className={`h-8 rounded-md px-3.5 transition-all ${
            tab === "trend"
              ? "bg-white font-semibold text-emerald-700 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Biểu đồ xu hướng
        </button>
        <button
          type="button"
          onClick={() => setTab("peak")}
          className={`h-8 rounded-md px-3.5 transition-all ${
            tab === "peak"
              ? "bg-white font-semibold text-emerald-700 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Mức đỉnh bậc
        </button>
      </div>

      <div className="mb-3 rounded border border-slate-300 bg-slate-50/80 px-3 py-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <QtyRow qty={thdQty} onQty={setThdQty} options={["U thd-f", "U thd-r", "I thd-f"]} channels={thdCh} onChannel={(ch) => setThdCh((list) => toggleIn(list, ch))} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <QtyRow qty={uQty} onQty={setUQty} options={["U harm", "U thd-f"]} channels={uCh} onChannel={(ch) => setUCh((list) => toggleIn(list, ch))} />
              <ModeRadios name="u-harm-mode" value={uMode} onChange={setUMode} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <QtyRow qty={iQty} onQty={setIQty} options={["I harm", "I thd-f"]} channels={iCh} onChannel={(ch) => setICh((list) => toggleIn(list, ch))} />
              <ModeRadios name="i-harm-mode" value={iMode} onChange={setIMode} />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-0.5">
            <div className="flex items-center gap-3 rounded border border-slate-200 bg-white px-2.5 py-1 text-[12px] text-slate-600">
              {AGGS.map((agg) => (
                <Check key={agg} checked={aggs.includes(agg)} onChange={() => setAggs((list) => toggleIn(list, agg))}>
                  {agg}
                </Check>
              ))}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setOrderOpen((v) => !v)}
                className={`h-8 rounded border px-3 text-[12px] font-medium ${
                  orderOpen ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                Order
              </button>
              {orderOpen ? (
                <div className="absolute right-0 z-20 mt-1 w-32 rounded border border-slate-200 bg-white p-2 shadow-md">
                  {ORDERS.map((order) => (
                    <Check
                      key={order}
                      checked={orders.includes(order)}
                      onChange={() => setOrders((list) => toggleIn(list, order))}
                    >
                      H{order}
                    </Check>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {tab === "trend" ? (
        <div className="flex items-stretch gap-2">
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
                className="pointer-events-none absolute -top-px text-[10px] leading-none text-emerald-600"
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
            <HarmPane
              title={`${thdQty} [%]`}
              series={thdSeries}
              viewWin={viewWin}
              hover={crosshair ? hover : null}
              onHover={setHover}
              domain={[3.5, 4.5]}
              ticks={[3.5, 4.0, 4.5]}
              formatTick={(v) => v.toFixed(1)}
            />
            <div className="h-px bg-slate-400" />
            <HarmPane
              title={`${uQty} ${uScale.unit}`}
              series={uSeries}
              viewWin={viewWin}
              hover={crosshair ? hover : null}
              onHover={setHover}
              domain={uScale.domain}
              ticks={uScale.ticks}
              formatTick={(v) => String(v)}
            />
            <div className="h-px bg-slate-400" />
            <HarmPane
              title={`${iQty} ${iScale.unit}`}
              series={iSeries}
              viewWin={viewWin}
              hover={crosshair ? hover : null}
              onHover={setHover}
              domain={iScale.domain}
              ticks={iScale.ticks}
              formatTick={(v) => String(v)}
              axis
            />
          </div>
          <ul className="h-[546px] w-[132px] shrink-0 overflow-y-auto py-2 text-[11px] leading-5">
            {legend.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 shrink-0" style={{ backgroundColor: s.color }} />
                <span style={{ color: s.color }}>{s.name}</span>
              </li>
            ))}
            {hover != null
              ? legend.map((s) => (
                  <li key={`${s.key}-v`} className="pl-[26px] text-slate-500">
                    {s.values[hover].toFixed(2)}
                  </li>
                ))
              : null}
          </ul>
        </div>
      ) : (
        <PeakLevelView
          uCh={uCh}
          iCh={iCh}
          orders={orders}
          aggs={aggs}
          seed={seed}
          uMode={uMode}
          iMode={iMode}
          uTitle={`${uQty} ${uScale.unit}`}
          iTitle={`${iQty} ${iScale.unit}`}
          uDomain={uScale.domain}
          iDomain={iScale.domain}
        />
      )}

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

function QtyRow({
  qty,
  onQty,
  options,
  channels,
  onChannel,
}: {
  qty: string;
  onQty: (value: string) => void;
  options: string[];
  channels: Channel[];
  onChannel: (ch: Channel) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
      <select
        value={qty}
        onChange={(e) => onQty(e.target.value)}
        className="h-7 rounded border border-slate-300 bg-white px-2 text-[12px] text-slate-700"
      >
        {options.map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
      <span className="text-slate-400">CH</span>
      {CHANNELS.map((ch) => (
        <Check key={ch} checked={channels.includes(ch)} onChange={() => onChannel(ch)}>
          {ch}
        </Check>
      ))}
    </div>
  );
}

function ModeRadios({
  name,
  value,
  onChange,
}: {
  name: string;
  value: Mode;
  onChange: (mode: Mode) => void;
}) {
  return (
    <div className="flex items-center gap-3 text-[12px] text-slate-600">
      {MODES.map((mode) => (
        <label key={mode} className="inline-flex cursor-pointer items-center gap-1">
          <input
            type="radio"
            name={name}
            checked={value === mode}
            onChange={() => onChange(mode)}
            className="accent-emerald-600"
          />
          {mode}
        </label>
      ))}
    </div>
  );
}

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1 text-[12px] text-slate-600">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-emerald-600" />
      {children}
    </label>
  );
}

function HarmPane({
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
  const H = 176;
  const pad = { l: 58, r: 10, t: 10, b: axis ? 40 : 10 };
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
      className="block h-[176px] w-full"
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
      <text x="14" y={H / 2} className="fill-slate-600" fontSize="11" transform={`rotate(-90 14 ${H / 2})`}>
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
            strokeWidth="1.5"
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

function PeakLevelView({
  uCh,
  iCh,
  orders,
  aggs,
  seed,
  uMode,
  iMode,
  uTitle,
  iTitle,
  uDomain,
  iDomain,
}: {
  uCh: Channel[];
  iCh: Channel[];
  orders: number[];
  aggs: Agg[];
  seed: number;
  uMode: Mode;
  iMode: Mode;
  uTitle: string;
  iTitle: string;
  uDomain: [number, number];
  iDomain: [number, number];
}) {
  const showOrders = [...ORDERS];
  return (
    <div className="overflow-hidden rounded-[2px] border border-slate-400 bg-white">
      <PeakPane
        title={uTitle}
        domain={uDomain}
        channels={uCh}
        orders={showOrders}
        highlight={orders}
        values={(ch, order) => {
          const samples = Array.from({ length: N }, (_, i) => uHarmWave(i, ch, order, aggs[0], seed, uMode));
          return Math.max(...samples);
        }}
        kind="u"
      />
      <div className="h-px bg-slate-400" />
      <PeakPane
        title={iTitle}
        domain={iDomain}
        channels={iCh}
        orders={showOrders}
        highlight={orders}
        values={(ch, order) => {
          const samples = Array.from({ length: N }, (_, i) => iHarmWave(i, ch, order, aggs[0], seed, iMode));
          return Math.max(...samples);
        }}
        kind="i"
        axis
      />
    </div>
  );
}

function PeakPane({
  title,
  domain,
  channels,
  orders,
  highlight,
  values,
  kind,
  axis = false,
}: {
  title: string;
  domain: [number, number];
  channels: Channel[];
  orders: readonly number[];
  highlight: number[];
  values: (ch: Channel, order: number) => number;
  kind: "u" | "i";
  axis?: boolean;
}) {
  const W = 820;
  const H = 220;
  const pad = { l: 58, r: 16, t: 12, b: axis ? 36 : 12 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const [yMin, yMax] = domain;
  const yAt = (v: number) => pad.t + ((yMax - v) / (yMax - yMin || 1)) * innerH;
  const groupW = innerW / orders.length;
  const barW = Math.max(4, (groupW * 0.62) / Math.max(1, channels.length));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-[220px] w-full">
      <rect x={pad.l} y={pad.t} width={innerW} height={innerH} fill="white" stroke="#6b7280" />
      <text x="14" y={H / 2} className="fill-slate-600" fontSize="11" transform={`rotate(-90 14 ${H / 2})`}>
        {title}
      </text>
      {[0, 1, 2, 3, 4].map((n) => {
        const v = yMin + ((yMax - yMin) * n) / 4;
        const y = yAt(v);
        return (
          <g key={n}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#e5e7eb" />
            <text x={pad.l - 6} y={y + 3} textAnchor="end" className="fill-slate-500" fontSize="10">
              {Number.isInteger(v) ? v : v.toFixed(1)}
            </text>
          </g>
        );
      })}
      {orders.map((order, oi) => {
        const gx = pad.l + oi * groupW;
        return (
          <g key={order}>
            {channels.map((ch, ci) => {
              const phase = PHASES[ch - 1];
              const v = Math.min(yMax, Math.max(yMin, values(ch, order)));
              const x = gx + groupW * 0.19 + ci * barW;
              const y = yAt(v);
              const h = Math.max(1, yAt(yMin) - y);
              return (
                <rect
                  key={ch}
                  x={x}
                  y={y}
                  width={barW - 1}
                  height={h}
                  fill={kind === "u" ? phase.color : orderColor(phase, order)}
                  opacity={highlight.includes(order) ? 1 : 0.35}
                />
              );
            })}
            {axis ? (
              <text x={gx + groupW / 2} y={H - 10} textAnchor="middle" className="fill-slate-600" fontSize="10">
                {order}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
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
        active ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white hover:bg-slate-50"
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
