"use client";

import { useMemo, useState } from "react";

const PHASE_COLORS = ["#e53935", "#43a047", "#1e88e5"];
const U_CHANNELS = [
  { ch: 1, name: "U12" },
  { ch: 2, name: "U23" },
  { ch: 3, name: "U31" },
];
const I_CHANNELS = [
  { ch: 1, name: "I1" },
  { ch: 2, name: "I2" },
  { ch: 3, name: "I3" },
];
const MEAS = ["rms", "pk+", "pk-", "dc", "cf"] as const;
const AGGS = ["MAX", "AVG", "MIN"] as const;

type Meas = (typeof MEAS)[number];
type Agg = (typeof AGGS)[number];

const N = 500;
const T0 = Date.parse("2026-01-27T09:40:00");

function waveAt(i: number, phase: number, kind: "u" | "i", meas: Meas, agg: Agg) {
  const seconds = (i / (N - 1)) * 240;
  if (kind === "u") {
    let v =
      399.05 +
      0.32 * Math.sin(seconds / 38 + phase) +
      0.2 * Math.sin(seconds / 11 + phase * 1.6) +
      0.1 * Math.sin(seconds * 1.8 + phase) +
      0.06 * Math.sin(seconds * 4.4 + phase * 0.7);
    if (meas === "pk+") v += 0.55;
    if (meas === "pk-") v -= 0.55;
    if (meas === "dc") v = 398.8 + 0.12 * Math.sin(seconds / 50 + phase);
    if (meas === "cf") v = 1.41 + 0.03 * Math.sin(seconds / 20 + phase);
    if (agg === "MAX") v += meas === "cf" ? 0.04 : 0.35;
    if (agg === "MIN") v -= meas === "cf" ? 0.04 : 0.35;
    return v;
  }
  let v =
    535 +
    42 * Math.sin(seconds / 18 + phase) +
    68 * Math.max(0, Math.sin(seconds / 26 + phase) ** 7) +
    22 * Math.sin(seconds / 5 + phase * 1.8) +
    10 * Math.sin(seconds * 2.1 + phase);
  if (meas === "pk+") v *= 1.12;
  if (meas === "pk-") v *= 0.82;
  if (meas === "dc") v = 28 + 6 * Math.sin(seconds / 40 + phase);
  if (meas === "cf") v = 1.55 + 0.08 * Math.sin(seconds / 16 + phase);
  if (agg === "MAX") v *= meas === "cf" ? 1.05 : 1.08;
  if (agg === "MIN") v *= meas === "cf" ? 0.95 : 0.9;
  return v;
}

function toggleIn<T>(list: T[], value: T) {
  if (list.includes(value)) return list.length === 1 ? list : list.filter((item) => item !== value);
  return [...list, value];
}

function timeLabel(index: number, kind: "full" | "min" | "sec") {
  const d = new Date(T0 + (index / (N - 1)) * 240000);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  if (kind === "full") return `1-27(Tue) ${hh}:${mm}`;
  if (kind === "min") return `${hh}:${mm}`;
  return ss === "30" ? "30" : ss;
}

export function UiWaveform() {
  const [uQty, setUQty] = useState("U");
  const [iQty, setIQty] = useState("I");
  const [uCh, setUCh] = useState([1, 2, 3]);
  const [iCh, setICh] = useState([1, 2, 3]);
  const [uMeas, setUMeas] = useState<Meas[]>(["rms"]);
  const [iMeas, setIMeas] = useState<Meas[]>(["rms"]);
  const [aggs, setAggs] = useState<Agg[]>(["AVG"]);
  const [hover, setHover] = useState<number | null>(null);
  const [crosshair, setCrosshair] = useState(true);
  const [window, setWindow] = useState({ start: 0, end: N - 1 });

  const span = window.end - window.start;
  const zoomIn = () => {
    const next = Math.max(40, Math.floor(span * 0.7));
    const mid = Math.floor((window.start + window.end) / 2);
    const start = Math.max(0, mid - Math.floor(next / 2));
    setWindow({ start, end: Math.min(N - 1, start + next) });
  };
  const zoomOut = () => {
    const next = Math.min(N - 1, Math.floor(span / 0.7));
    const mid = Math.floor((window.start + window.end) / 2);
    const start = Math.max(0, mid - Math.floor(next / 2));
    setWindow({ start, end: Math.min(N - 1, start + next) });
  };

  const uSeries = useMemo(
    () =>
      U_CHANNELS.flatMap((item, idx) =>
        uCh.includes(item.ch)
          ? uMeas.flatMap((meas) =>
              aggs.map((agg) => ({
                key: `${item.name}-${meas}-${agg}`,
                name: `${item.name} ${meas} ${agg}`,
                color: PHASE_COLORS[idx],
                values: Array.from({ length: N }, (_, i) => waveAt(i, idx * 0.9, "u", meas, agg)),
              })),
            )
          : [],
      ),
    [uCh, uMeas, aggs],
  );

  const iSeries = useMemo(
    () =>
      I_CHANNELS.flatMap((item, idx) =>
        iCh.includes(item.ch)
          ? iMeas.flatMap((meas) =>
              aggs.map((agg) => ({
                key: `${item.name}-${meas}-${agg}`,
                name: `${item.name} ${meas} ${agg}`,
                color: PHASE_COLORS[idx],
                values: Array.from({ length: N }, (_, i) => waveAt(i, idx * 1.1, "i", meas, agg)),
              })),
            )
          : [],
      ),
    [iCh, iMeas, aggs],
  );

  return (
    <div className="font-sans">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-3">
        <ParamGroup
          qty={uQty}
          onQty={setUQty}
          options={["U", "Un", "U0"]}
          channels={uCh}
          onChannel={(ch) => setUCh((list) => toggleIn(list, ch))}
          meas={uMeas}
          onMeas={(m) => setUMeas((list) => toggleIn(list, m))}
        />
        <ParamGroup
          qty={iQty}
          onQty={setIQty}
          options={["I", "In", "I0"]}
          channels={iCh}
          onChannel={(ch) => setICh((list) => toggleIn(list, ch))}
          meas={iMeas}
          onMeas={(m) => setIMeas((list) => toggleIn(list, m))}
        />
        <div className="flex items-center gap-3 pt-6 text-[12px] text-slate-600">
          {AGGS.map((agg) => (
            <Check key={agg} checked={aggs.includes(agg)} onChange={() => setAggs((list) => toggleIn(list, agg))}>
              {agg}
            </Check>
          ))}
        </div>
      </div>

      <div className="flex items-stretch gap-3">
        <div className="min-w-0 flex-1 overflow-hidden rounded-[2px] border border-slate-400 bg-white">
          <div className="border-b border-slate-300 px-1">
            <TimeSlider start={window.start} end={window.end} onChange={setWindow} />
          </div>
          <WavePane
            title={`${uQty} [V]`}
            series={uSeries}
            window={window}
            hover={crosshair ? hover : null}
            onHover={setHover}
            domain={uMeas.includes("cf") && uMeas.length === 1 ? [1.2, 1.6] : [397, 401]}
          />
          <div className="h-2 border-y border-slate-300 bg-slate-200" />
          <WavePane
            title={`${iQty} [A]`}
            series={iSeries}
            window={window}
            hover={crosshair ? hover : null}
            onHover={setHover}
            domain={iMeas.includes("cf") && iMeas.length === 1 ? [1.2, 1.8] : [450, 650]}
            axis
          />
        </div>
        <div className="flex w-[148px] shrink-0 flex-col justify-around py-8">
          <SeriesLegend series={uSeries} hover={crosshair ? hover : null} />
          <SeriesLegend series={iSeries} hover={crosshair ? hover : null} />
        </div>
      </div>

      <div className="mt-2 flex gap-1">
        <ToolBtn label="Phóng to" onClick={zoomIn}>
          <ZoomIcon plus />
        </ToolBtn>
        <ToolBtn label="Thu nhỏ" onClick={zoomOut}>
          <ZoomIcon plus={false} />
        </ToolBtn>
        <ToolBtn label="Vừa khung" onClick={() => setWindow({ start: 0, end: N - 1 })}>
          <FitIcon />
        </ToolBtn>
        <ToolBtn label="Con trỏ" active={crosshair} onClick={() => setCrosshair((v) => !v)}>
          <CursorIcon />
        </ToolBtn>
      </div>
    </div>
  );
}

function ParamGroup({
  qty,
  onQty,
  options,
  channels,
  onChannel,
  meas,
  onMeas,
}: {
  qty: string;
  onQty: (value: string) => void;
  options: string[];
  channels: number[];
  onChannel: (ch: number) => void;
  meas: Meas[];
  onMeas: (meas: Meas) => void;
}) {
  return (
    <div className="min-w-[280px]">
      <div className="flex items-center gap-3 text-[12px] text-slate-600">
        <select
          value={qty}
          onChange={(e) => onQty(e.target.value)}
          className="h-8 rounded border border-slate-300 bg-white px-2 text-[13px] text-slate-700"
        >
          {options.map((opt) => (
            <option key={opt}>{opt}</option>
          ))}
        </select>
        <span className="text-slate-400">CH</span>
        {[1, 2, 3].map((ch) => (
          <Check key={ch} checked={channels.includes(ch)} onChange={() => onChannel(ch)}>
            {ch}
          </Check>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-slate-600">
        {MEAS.map((item) => (
          <Check key={item} checked={meas.includes(item)} onChange={() => onMeas(item)}>
            {item}
          </Check>
        ))}
      </div>
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
    <label className="inline-flex cursor-pointer items-center gap-1">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-[#1a73e8]" />
      {children}
    </label>
  );
}

function TimeSlider({
  start,
  end,
  onChange,
}: {
  start: number;
  end: number;
  onChange: (range: { start: number; end: number }) => void;
}) {
  const left = (start / (N - 1)) * 100;
  const width = ((end - start) / (N - 1)) * 100;
  return (
    <div className="relative h-4 bg-slate-50">
      <div
        className="absolute inset-y-0 bg-[#d7e2ef]"
        style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
      />
      <input
        type="range"
        min={0}
        max={N - 21}
        value={start}
        onChange={(e) => {
          const next = Number(e.target.value);
          const span = end - start;
          onChange({ start: next, end: Math.min(N - 1, next + span) });
        }}
        className="absolute inset-x-0 top-0 z-10 h-full w-full cursor-ew-resize appearance-none bg-transparent"
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
  );
}

function WavePane({
  title,
  series,
  window,
  hover,
  onHover,
  domain,
  axis = false,
}: {
  title: string;
  series: { key: string; name: string; color: string; values: number[] }[];
  window: { start: number; end: number };
  hover: number | null;
  onHover: (index: number | null) => void;
  domain: [number, number];
  axis?: boolean;
}) {
  const W = 760;
  const H = 240;
  const pad = { l: 50, r: 10, t: 14, b: 28 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const [yMin, yMax] = domain;
  const xAt = (i: number) =>
    pad.l + ((i - window.start) / Math.max(1, window.end - window.start)) * innerW;
  const yAt = (v: number) => pad.t + ((yMax - v) / (yMax - yMin || 1)) * innerH;
  const ticks = 5;

  const pathOf = (values: number[]) => {
    let d = "";
    for (let i = window.start; i <= window.end; i++) {
      const x = xAt(i);
      const y = yAt(values[i]);
      d += `${i === window.start ? "M" : "L"} ${x} ${y} `;
    }
    return d;
  };

  const timeTicks: { i: number; kind: "full" | "min" | "sec" }[] = [];
  if (axis) {
    for (let i = window.start; i <= window.end; i++) {
      const sec = Math.round((i / (N - 1)) * 240);
      if (sec % 60 === 0) timeTicks.push({ i, kind: i === window.start ? "full" : "min" });
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
        const i = Math.round(window.start + t * (window.end - window.start));
        onHover(Math.max(window.start, Math.min(window.end, i)));
      }}
    >
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} fill="white" />
      <text x="6" y={H / 2} className="fill-slate-500" fontSize="12" transform={`rotate(-90 6 ${H / 2})`}>
        {title}
      </text>
      {Array.from({ length: ticks }, (_, n) => {
        const v = yMin + ((yMax - yMin) * n) / (ticks - 1);
        const y = yAt(v);
        return (
          <g key={n}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#e6e8eb" />
            <text x={pad.l - 6} y={y + 3} textAnchor="end" className="fill-slate-400" fontSize="10">
              {yMax - yMin < 10 ? v.toFixed(1) : Math.round(v)}
            </text>
          </g>
        );
      })}
      {Array.from({ length: 9 }, (_, n) => {
        const i = window.start + ((window.end - window.start) * n) / 8;
        return (
          <line key={n} x1={xAt(i)} x2={xAt(i)} y1={pad.t} y2={H - pad.b} stroke="#eef0f2" />
        );
      })}
      {series.map((s) => (
        <path key={s.key} d={pathOf(s.values)} fill="none" stroke={s.color} strokeWidth="1.35" />
      ))}
      {hover != null ? (
        <line x1={xAt(hover)} x2={xAt(hover)} y1={pad.t} y2={H - pad.b} stroke="#94a3b8" strokeDasharray="3 3" />
      ) : null}
      {axis
        ? timeTicks.map((tick) => (
            <text
              key={`${tick.i}-${tick.kind}`}
              x={xAt(tick.i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize={tick.kind === "sec" ? 9 : 10}
            >
              {timeLabel(tick.i, tick.kind)}
            </text>
          ))
        : null}
    </svg>
  );
}

function SeriesLegend({
  series,
  hover,
}: {
  series: { key: string; name: string; color: string; values: number[] }[];
  hover: number | null;
}) {
  return (
    <ul className="text-[11px] leading-5">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="h-0.5 w-4" style={{ backgroundColor: s.color }} />
          <span style={{ color: s.color }}>{s.name}</span>
        </li>
      ))}
      {hover != null
        ? series.map((s) => (
            <li key={`${s.key}-v`} className="pl-[22px] text-slate-500">
              {s.values[hover].toFixed(2)}
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
