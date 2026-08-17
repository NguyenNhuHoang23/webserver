"use client";

import { useMemo, useState } from "react";

type EnergyKind = "Điện" | "Nhiệt" | "Khí nén" | "Hơi";
type Resolution = "Ngày" | "Tháng" | "Năm";
type Category = "Chi phí điện năng" | "Chi phí nhiệt năng" | "Chi phí khí nén" | "Chi phí hơi";

const ENERGIES: { id: EnergyKind; icon: "bolt" | "heat" | "air" | "steam" }[] = [
  { id: "Điện", icon: "bolt" },
  { id: "Nhiệt", icon: "heat" },
  { id: "Khí nén", icon: "air" },
  { id: "Hơi", icon: "steam" },
];

const POINTS = [
  { id: 1, name: "Điểm đo 1", code: "(DB-OFF1) Tủ điện văn phòng" },
  { id: 2, name: "Điểm đo 2", code: "(DB-PRD1) Tủ điện sản xuất" },
  { id: 3, name: "Điểm đo 3", code: "(DB-CMP1) Máy nén khí 1" },
  { id: 4, name: "Điểm đo 4", code: "(DB-HVAC) Điều hòa trung tâm" },
  { id: 5, name: "Điểm đo 5", code: "(DB-MAIN) Tủ điện tổng" },
];

const CATEGORIES: Category[] = [
  "Chi phí điện năng",
  "Chi phí nhiệt năng",
  "Chi phí khí nén",
  "Chi phí hơi",
];

const TOU = [
  { id: "peak", label: "Cao", color: "#e67e22" },
  { id: "normal", label: "Thường", color: "#27ae60" },
  { id: "off", label: "Thấp", color: "#7ec8e3" },
  { id: "none", label: "Không", color: "#9aa3af" },
] as const;

function formatVnd(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

function hourLabel(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function costSeries(seed: number, pointId: number, resolution: Resolution) {
  const count = resolution === "Năm" ? 12 : resolution === "Ngày" ? 24 : 8;
  const startHour = resolution === "Ngày" ? 0 : 1;
  const targets = [68719, 54210, 81340, 42180, 95880];
  const target = targets[pointId - 1] * (1 + (seed - 1) * 0.015);
  const raw = Array.from({ length: count }, (_, i) => {
    const ramp = (i + 1) / count;
    const dark = 6200 + 3600 * ramp + 260 * Math.sin(i * 1.15 + seed);
    const light = dark * (0.55 + 0.07 * Math.sin(i + pointId));
    return { dark, light };
  });
  const sumDark = raw.reduce((s, b) => s + b.dark, 0);
  const scale = target / sumDark;
  return raw.map((bar, i) => {
    const hour = resolution === "Năm" ? i + 1 : startHour + i;
    return {
      key: hour,
      label: resolution === "Năm" ? `T${hour}` : hourLabel(hour),
      light: Math.round(bar.light * scale),
      dark: Math.round(bar.dark * scale),
    };
  });
}

export function CostCharts() {
  const [category, setCategory] = useState<Category>("Chi phí điện năng");
  const [energy, setEnergy] = useState<EnergyKind>("Điện");
  const [resolution, setResolution] = useState<Resolution>("Tháng");
  const [date, setDate] = useState("2026-07-19");
  const [pointId, setPointId] = useState(1);
  const [seed, setSeed] = useState(1);
  const [showSum, setShowSum] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  const point = POINTS.find((p) => p.id === pointId) ?? POINTS[0];
  const bars = useMemo(() => costSeries(seed, pointId, resolution), [seed, pointId, resolution]);
  const total = bars.reduce((s, b) => s + b.dark, 0);
  const tou = useMemo(() => {
    const normal = Math.round(total * (38493 / 68719));
    const off = total - normal;
    return { peak: 0, normal, off, none: 0 };
  }, [total]);

  const dateLabel = (() => {
    const [y, m, d] = date.split("-");
    return `${m}/${d}/${y}`;
  })();

  const exportCsv = () => {
    const rows = ["Thời điểm,Chi phí (VND)", ...bars.map((b) => `${b.label},${b.dark}`)].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chi-phi-${point.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full min-h-0 bg-[#f4f6f9]">
      <aside className="flex w-[248px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h1 className="text-[18px] font-bold text-slate-800">Biểu Đồ Chi Phí</h1>
          <p className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-slate-400">
            ANALYSIS CATEGORIES
          </p>
        </div>
        <div className="px-4 py-3">
          <select
            value={category}
            onChange={(e) => {
              const next = e.target.value as Category;
              setCategory(next);
              setEnergy(
                next.includes("nhiệt") ? "Nhiệt" : next.includes("khí") ? "Khí nén" : next.includes("hơi") ? "Hơi" : "Điện",
              );
            }}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#1a73e8]"
          >
            {CATEGORIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {POINTS.map((item) => {
            const active = item.id === pointId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPointId(item.id)}
                className={`mb-1 flex h-10 w-full items-center gap-2.5 rounded-md px-3 text-left text-[13px] font-medium ${
                  active ? "bg-[#1e4f8a] text-white" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ChartGlyph className="h-4 w-4" />
                {item.id}. {item.name}
              </button>
            );
          })}
        </nav>
        <div className="p-4">
          <button
            type="button"
            onClick={() => setSeed((n) => n + 1)}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#d9ebf8] text-[13px] font-semibold text-[#1a5f8a] hover:bg-[#c7e1f4]"
          >
            <RefreshIcon className="h-4 w-4" />
            Refresh Data
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-white">
            {ENERGIES.map((item) => {
              const active = energy === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setEnergy(item.id);
                    setCategory(
                      item.id === "Nhiệt"
                        ? "Chi phí nhiệt năng"
                        : item.id === "Khí nén"
                          ? "Chi phí khí nén"
                          : item.id === "Hơi"
                            ? "Chi phí hơi"
                            : "Chi phí điện năng",
                    );
                  }}
                  className={`inline-flex h-10 items-center gap-1.5 px-3.5 text-[13px] font-medium ${
                    active ? "bg-[#1e4f8a] text-white" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <EnergyGlyph type={item.icon} className="h-4 w-4" />
                  {item.id}
                </button>
              );
            })}
          </div>
          <div className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-white">
            {(["Ngày", "Tháng", "Năm"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setResolution(item)}
                className={`h-10 px-4 text-[13px] font-medium ${
                  resolution === item ? "bg-[#5aa3d9] text-white" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-[#1a73e8] bg-white px-3 text-[13px] font-medium text-[#1a73e8]">
            <CalendarIcon className="h-4 w-4" />
            {dateLabel}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="sr-only"
            />
          </label>
        </div>

        <div className="mt-4 grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-800">Chi tiết chi phí</h2>
                <p className="mt-1.5 inline-flex items-center gap-2 text-[12px] text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#3d7ec4]" />
                  {point.code}
                  {showSum ? (
                    <span className="font-semibold text-[#1a73e8]">Σ {formatVnd(total)} VND</span>
                  ) : null}
                </p>
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
                <IconBtn label="Làm mới" onClick={() => setSeed((n) => n + 1)}>
                  <RefreshIcon className="h-4 w-4" />
                </IconBtn>
              </div>
            </div>
            <GroupedBarChart bars={bars} hover={hover} onHover={setHover} />
          </article>

          <div className="flex min-h-0 flex-col gap-4">
            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <h2 className="text-center text-[13px] font-bold tracking-wide text-slate-700">
                TỔNG HỢP CHI PHÍ THEO ĐIỂM ĐO
              </h2>
              <Donut value={total} />
              <div className="mt-2 rounded-md bg-[#eaf3fb] px-3 py-2.5 text-[12px] text-slate-700">
                <p className="flex items-start gap-2">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1e4f8a]" />
                  <span>
                    {point.code}
                    <span className="mt-0.5 block font-semibold">
                      {formatVnd(total)} VND (~100%)
                    </span>
                  </span>
                </p>
              </div>
            </article>

            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <h2 className="text-center text-[13px] font-bold tracking-wide text-slate-700">
                TỔNG HỢP CHI PHÍ THEO KHUNG GIỜ
              </h2>
              <TouChart values={tou} />
              <p className="mt-1 text-right text-[11px] text-slate-400">(VND)</p>
            </article>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-500">
          <p className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Hệ thống đang hoạt động bình thường
          </p>
          <p>Cập nhật lúc: 2026-07-19 12:26:38</p>
        </div>
      </div>
    </div>
  );
}

function GroupedBarChart({
  bars,
  hover,
  onHover,
}: {
  bars: { key: number; label: string; light: number; dark: number }[];
  hover: number | null;
  onHover: (index: number | null) => void;
}) {
  const W = 760;
  const H = 360;
  const pad = { l: 52, r: 16, t: 28, b: 32 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const yMax = Math.max(
    10000,
    Math.ceil(Math.max(...bars.flatMap((b) => [b.light, b.dark])) / 2000) * 2000,
  );
  const yAt = (v: number) => pad.t + ((yMax - v) / yMax) * innerH;
  const groupW = innerW / bars.length;
  const barW = Math.max(6, groupW * 0.32);
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (yMax * i) / tickCount);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-2 h-[340px] w-full"
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
              {v === 0 ? "0" : v.toLocaleString("en-US")}
            </text>
          </g>
        );
      })}
      {bars.map((bar, i) => {
        const gx = pad.l + i * groupW;
        const x1 = gx + groupW * 0.16;
        const x2 = x1 + barW + 3;
        return (
          <g key={bar.key} onMouseEnter={() => onHover(i)}>
            <rect
              x={x1}
              y={yAt(bar.light)}
              width={barW}
              height={Math.max(0, yAt(0) - yAt(bar.light))}
              fill={hover === i ? "#8ec0ea" : "#9ec9e8"}
            />
            <rect
              x={x2}
              y={yAt(bar.dark)}
              width={barW}
              height={Math.max(0, yAt(0) - yAt(bar.dark))}
              fill={hover === i ? "#1a4f86" : "#1e5a96"}
            />
            <text
              x={gx + groupW / 2}
              y={H - 10}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize="11"
            >
              {bar.label}
            </text>
          </g>
        );
      })}
      {hover != null ? (
        <g transform={`translate(${Math.min(pad.l + hover * groupW + 12, W - 150)}, ${pad.t + 6})`}>
          <rect width="138" height="52" rx="4" fill="white" stroke="#e2e8f0" />
          <text x="10" y="18" className="fill-slate-500" fontSize="11">
            {bars[hover].label}
          </text>
          <text x="10" y="36" className="fill-slate-700" fontSize="12" fontWeight="600">
            {formatVnd(bars[hover].dark)} VND
          </text>
        </g>
      ) : null}
    </svg>
  );
}

function Donut({ value }: { value: number }) {
  const r = 58;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto my-3 h-[168px] w-[168px]">
      <svg viewBox="0 0 160 160" className="h-full w-full">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#e8eef4" strokeWidth="22" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="#1e4f8a"
          strokeWidth="22"
          strokeDasharray={c}
          strokeDashoffset={0}
          strokeLinecap="butt"
          transform="rotate(-90 80 80)"
        />
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
  const innerH = H - pad.t - pad.b;
  const yMax = Math.max(values.normal, values.off, 1);
  const yAt = (v: number) => pad.t + ((yMax - v) / yMax) * innerH;
  const items = [
    { label: "Cao", color: TOU[0].color, value: values.peak },
    { label: "Thường", color: TOU[1].color, value: values.normal },
    { label: "Thấp", color: TOU[2].color, value: values.off },
    { label: "Không", color: TOU[3].color, value: values.none },
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
              {formatVnd(item.value)}
            </text>
            <rect x={x} y={yAt(item.value) - (item.value === 0 ? 3 : 0)} width={barW} height={h} fill={item.color} />
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

function ChartGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 18V10M10 18V6M15 18v-5M20 18V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function EnergyGlyph({
  type,
  className,
}: {
  type: "bolt" | "heat" | "air" | "steam";
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
        <path
          d="M5 17c1.5-1 2.5-3 2.5-5S6.5 8 5 7M12 17c1.5-1 2.5-3 2.5-5S13.5 8 12 7M19 17c1.5-1 2.5-3 2.5-5S20.5 8 19 7"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
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
