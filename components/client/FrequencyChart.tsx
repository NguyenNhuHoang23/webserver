"use client";

import { useMemo, useState } from "react";
import { getTimeFilterLabel, type TimeFilterValue } from "./TimeFilterBar";

const N = 160;
const T0 = Date.parse("2026-01-27T09:40:00");
const AGGS = ["MAX", "AVG", "MIN"] as const;
type Agg = (typeof AGGS)[number];

function toggleIn<T>(list: T[], value: T) {
  if (list.includes(value)) return list.length === 1 ? list : list.filter((item) => item !== value);
  return [...list, value];
}

function waveAt(i: number, agg: Agg, seed: number) {
  const seconds = (i / (N - 1)) * 240;
  let v =
    50.29 +
    0.028 * Math.sin(seconds / 48 + seed * 0.2) +
    0.012 * Math.sin(seconds / 22 + 0.8);
  if (agg === "MAX") v += 0.018;
  if (agg === "MIN") v -= 0.018;
  return Number(Math.max(50.242, Math.min(50.338, v)).toFixed(4));
}

function timeLabel(index: number, kind: "full" | "min" | "sec" | "tooltip") {
  const d = new Date(T0 + (index / (N - 1)) * 240000);
  const yyyy = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  if (kind === "tooltip") return `${yyyy}-${mo}-${dd} ${hh}:${mm}:${ss}`;
  if (kind === "full") return `1-27(Tue) ${hh}:${mm}`;
  if (kind === "min") return `${hh}:${mm}`;
  return ss === "30" ? "30" : "00";
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

const COLORS: Record<Agg, string> = {
  MAX: "#c62828",
  AVG: "#e53935",
  MIN: "#ef9a9a",
};

export function FrequencyChart({ seed, timeFilter }: { seed: number; onRefresh?: () => void; timeFilter: TimeFilterValue }) {
  const [qty, setQty] = useState("Freq");
  const [slotA, setSlotA] = useState("-");
  const [slotB, setSlotB] = useState("-");
  const [aggs] = useState<Agg[]>(["AVG"]);
  const [hover, setHover] = useState<number | null>(null);
  const [viewWin, setViewWin] = useState({ start: 0, end: N - 1 });
  const [crosshair, setCrosshair] = useState(true);

  const series = useMemo(
    () =>
      aggs.map((agg) => ({
        key: agg,
        name: `Freq ${agg}`,
        color: COLORS[agg],
        values: Array.from({ length: N }, (_, i) => waveAt(i, agg, seed)),
      })),
    [aggs, seed],
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
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-4">
      {/* Top bar: chọn kênh; bộ lọc thời gian dùng thanh chung của trang */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 outline-none focus:border-emerald-500 shadow-2xs"
          >
            <option value="Freq">Tần số (Freq)</option>
            <option value="U">Điện áp (U)</option>
            <option value="I">Dòng điện (I)</option>
          </select>
          {qty !== "Freq" && (
            <>
              <select
                value={slotA === "-" ? "CH1" : slotA}
                onChange={(e) => setSlotA(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 outline-none focus:border-emerald-500 shadow-2xs"
              >
                <option value="CH1">Pha A (CH1)</option>
                <option value="CH2">Pha B (CH2)</option>
                <option value="CH3">Pha C (CH3)</option>
              </select>
              <select
                value={slotB === "-" ? "rms" : slotB}
                onChange={(e) => setSlotB(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 outline-none focus:border-emerald-500 shadow-2xs"
              >
                <option value="rms">Hiệu dụng (RMS)</option>
                <option value="pk+">Đỉnh dương (Pk+)</option>
                <option value="pk-">Đỉnh âm (Pk-)</option>
              </select>
            </>
          )}
        </div>

      </div>

      <div className="-mx-1 min-w-0 overflow-hidden rounded-[2px] border border-slate-400 bg-white sm:-mx-2">
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
        <FreqPane
          qty={qty}
          series={series}
          viewWin={viewWin}
          hover={crosshair ? hover : null}
          onHover={setHover}
        />
      </div>

      {/* Dưới cùng chỉ giữ lại công cụ zoom / view */}
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <div className="flex gap-1">
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
        <span className="text-[11px] text-slate-400">
          Kỳ hiển thị: {getTimeFilterLabel(timeFilter)}
        </span>
      </div>
    </section>
  );
}

function FreqPane({
  qty,
  series,
  viewWin,
  hover,
  onHover,
}: {
  qty: string;
  series: { key: string; name: string; color: string; values: number[] }[];
  viewWin: { start: number; end: number };
  hover: number | null;
  onHover: (index: number | null) => void;
}) {
  const W = 820;
  const H = 340;
  const pad = { l: 58, r: 12, t: 12, b: 42 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const yMin = 50.24;
  const yMax = 50.34;
  const yTicks = [50.24, 50.26, 50.28, 50.3, 50.32, 50.34];
  const filterId = "freq-tip-shadow";
  const tipW = 168;
  const tipH = 22 + Math.max(series.length, 1) * 18;
  const xAt = (i: number) =>
    pad.l + ((i - viewWin.start) / Math.max(1, viewWin.end - viewWin.start)) * innerW;
  const yAt = (v: number) => pad.t + ((yMax - v) / (yMax - yMin)) * innerH;

  const timeTicks: { i: number; kind: "full" | "min" | "sec" }[] = [];
  for (let i = viewWin.start; i <= viewWin.end; i++) {
    const sec = Math.round((i / (N - 1)) * 240);
    if (sec % 60 === 0) timeTicks.push({ i, kind: i === viewWin.start ? "full" : "min" });
    else if (sec % 30 === 0) timeTicks.push({ i, kind: "sec" });
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-[340px] w-full"
      onMouseLeave={() => onHover(null)}
      onMouseMove={(e) => {
        const box = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - box.left) / box.width) * W;
        const t = (x - pad.l) / innerW;
        const i = Math.round(viewWin.start + t * (viewWin.end - viewWin.start));
        onHover(Math.max(viewWin.start, Math.min(viewWin.end, i)));
      }}
    >
      <rect x={pad.l} y={pad.t} width={innerW} height={innerH} fill="white" stroke="#94a3b8" />
      <line x1={pad.l} x2={W - pad.r} y1={pad.t} y2={pad.t} stroke="#111827" strokeWidth="1.4" />
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="#111827" strokeWidth="1.4" />
      <text
        x="14"
        y={H / 2}
        className="fill-slate-600"
        fontSize="12"
        transform={`rotate(-90 14 ${H / 2})`}
      >
        {qty} [Hz]
      </text>
      {yTicks.map((v) => {
        const y = yAt(v);
        return (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#e5e7eb" />
            <text x={pad.l - 6} y={y + 3} textAnchor="end" className="fill-slate-500" fontSize="10">
              {v.toFixed(2)}
            </text>
          </g>
        );
      })}
      {Array.from({ length: 9 }, (_, n) => {
        const i = viewWin.start + ((viewWin.end - viewWin.start) * n) / 8;
        return (
          <line key={n} x1={xAt(i)} x2={xAt(i)} y1={pad.t} y2={H - pad.b} stroke="#eef0f2" />
        );
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
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
      <defs>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.12" />
        </filter>
      </defs>
      {hover != null ? (
        <g pointerEvents="none">
          <line
            x1={xAt(hover)}
            x2={xAt(hover)}
            y1={pad.t}
            y2={H - pad.b}
            stroke="#64748b"
            strokeDasharray="4 3"
          />
          {series.map((s) => (
            <circle
              key={`${s.key}-dot`}
              cx={xAt(hover)}
              cy={yAt(s.values[hover])}
              r="3.5"
              fill={s.color}
              stroke="white"
              strokeWidth="1.5"
            />
          ))}
          <rect
            x={Math.min(Math.max(xAt(hover) - 68, pad.l), W - pad.r - 136)}
            y={H - pad.b + 2}
            width="136"
            height="16"
            rx="2"
            fill="#334155"
          />
          <text
            x={Math.min(Math.max(xAt(hover), pad.l + 68), W - pad.r - 68)}
            y={H - pad.b + 13}
            textAnchor="middle"
            fill="white"
            fontSize="10"
            fontWeight="600"
          >
            {timeLabel(hover, "tooltip")}
          </text>
          {(() => {
            const hx = xAt(hover);
            const tipX = hx + 12 + tipW > W - pad.r - 4 ? hx - tipW - 12 : hx + 12;
            const tipY = Math.min(pad.t + 8, H - pad.b - tipH - 4);
            return (
              <g transform={`translate(${Math.max(pad.l, tipX)}, ${Math.max(pad.t, tipY)})`}>
                <rect
                  width={tipW}
                  height={tipH}
                  rx="6"
                  fill="white"
                  stroke="#e2e8f0"
                  filter={`url(#${filterId})`}
                />
                <text x="10" y="16" className="fill-slate-600" fontSize="11" fontWeight="600">
                  {timeLabel(hover, "tooltip")}
                </text>
                {series.map((s, i) => (
                  <g key={`${s.key}-tip`} transform={`translate(10, ${28 + i * 18})`}>
                    <circle cx="4" cy="-3" r="3.5" fill={s.color} />
                    <text x="14" y="0" fontSize="11" fill="#475569">
                      {s.name}
                    </text>
                    <text x={tipW - 12} y="0" textAnchor="end" fontSize="11" fontWeight="700" fill="#0f172a">
                      {s.values[hover].toFixed(4)}
                    </text>
                  </g>
                ))}
              </g>
            );
          })()}
        </g>
      ) : null}
      {timeTicks.map((tick) => (
        <g key={`${tick.i}-${tick.kind}`}>
          {tick.kind === "sec" ? (
            <text x={xAt(tick.i)} y={H - 26} textAnchor="middle" className="fill-slate-400" fontSize="9">
              {timeLabel(tick.i, "sec")}
            </text>
          ) : (
            <text x={xAt(tick.i)} y={H - 10} textAnchor="middle" className="fill-slate-600" fontSize="10">
              {timeLabel(tick.i, tick.kind)}
            </text>
          )}
        </g>
      ))}
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
