"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

const BLUE = "#3b82f6";
const GREEN = "#22c55e";

const DIRECT_ITEMS = [
  { id: "lpg", label: "1. Khí Gas (LPG)" },
  { id: "vehicle", label: "2. Nhiên liệu phương tiện" },
  { id: "leak", label: "3. Phát thải rò rỉ (Gas lạnh)" },
];

const INDIRECT_ITEMS = [
  { id: "grid", label: "1. Điện lưới" },
  { id: "steam", label: "2. Phát thải mua hơi nước" },
];

const ROWS = [
  { id: "grid", name: "Sử dụng điện năng", kind: "Gián tiếp" as const, tons: 3188.1, share: 75 },
  { id: "lpg", name: "Khí Gas (LPG)", kind: "Trực tiếp" as const, tons: 850.2, share: 20 },
  { id: "vehicle", name: "Nhiên liệu phương tiện", kind: "Trực tiếp" as const, tons: 170.0, share: 4 },
  { id: "leak", name: "Phát thải rò rỉ (Gas lạnh)", kind: "Trực tiếp" as const, tons: 42.5, share: 1 },
];

const YEARS = [2023, 2024, 2025, 2026];
const CONFIG_LINKS = [
  { href: "/cau-hinh", label: "Cấu hình điểm đo" },
  { href: "/chi-phi", label: "Cấu hình chi phí" },
  { href: "/cau-hinh", label: "Cấu hình khí nhà kính" },
  { href: "/canh-bao", label: "Cấu hình cảnh báo" },
];

function fmt(n: number, digits = 1) {
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function GreenhouseCharts() {
  const pathname = usePathname();
  const base = pathname.split("/").slice(0, 3).join("/") || "/du-an";
  const [year, setYear] = useState(2024);
  const [source, setSource] = useState("grid");
  const [openDirect, setOpenDirect] = useState(false);
  const [openIndirect, setOpenIndirect] = useState(true);
  const [indirectGroup, setIndirectGroup] = useState("Nguồn phát thải gián tiếp");
  const [directGroup, setDirectGroup] = useState("Nguồn phát thải trực tiếp");

  const scale = 1 + (year - 2024) * 0.035;
  const rows = useMemo(
    () => ROWS.map((row) => ({ ...row, tons: Number((row.tons * scale).toFixed(1)) })),
    [scale],
  );
  const total = Number(rows.reduce((s, r) => s + r.tons, 0).toFixed(1));
  const goal = Math.max(62, Math.min(96, 85 - (year - 2024) * 4));

  return (
    <div className="flex h-full min-h-0 bg-[#f4f6f9]">
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h1 className="text-[16px] font-bold text-slate-800">Nguồn phát thải</h1>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3 text-[13px]">
          <Accordion
            label="Trực tiếp"
            open={openDirect}
            onToggle={() => setOpenDirect((v) => !v)}
            active={DIRECT_ITEMS.some((item) => item.id === source)}
          >
            <select
              value={directGroup}
              onChange={(e) => setDirectGroup(e.target.value)}
              className="mb-1.5 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[12px] text-slate-600 outline-none"
            >
              <option>Nguồn phát thải trực tiếp</option>
            </select>
            {DIRECT_ITEMS.map((item) => (
              <SideItem
                key={item.id}
                active={source === item.id}
                onClick={() => setSource(item.id)}
              >
                {item.label}
              </SideItem>
            ))}
          </Accordion>
          <Accordion
            label="Gián tiếp"
            open={openIndirect}
            onToggle={() => setOpenIndirect((v) => !v)}
            active={INDIRECT_ITEMS.some((item) => item.id === source)}
          >
            <select
              value={indirectGroup}
              onChange={(e) => setIndirectGroup(e.target.value)}
              className="mb-1.5 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[12px] text-slate-600 outline-none"
            >
              <option>Nguồn phát thải gián tiếp</option>
            </select>
            {INDIRECT_ITEMS.map((item) => (
              <SideItem
                key={item.id}
                active={source === item.id}
                onClick={() => setSource(item.id)}
              >
                {item.label}
              </SideItem>
            ))}
          </Accordion>
        </nav>
        <div className="border-t border-slate-100 px-2 py-3">
          {CONFIG_LINKS.map((item) => (
            <Link
              key={item.label}
              href={`${base}${item.href}`}
              className="block rounded-md px-3 py-2 text-[13px] text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[22px] font-bold tracking-tight text-slate-800">
            Tổng quan phát thải khí nhà kính
          </h2>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none focus:border-[#1a73e8]"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard
            label="TỔNG LƯỢNG PHÁT THẢI"
            value={`${fmt(total)} tấn`}
            hint="CO₂e"
            trend={-2.4}
          />
          <KpiCard
            label="CƯỜNG ĐỘ PHÁT THẢI"
            value="0.12"
            hint="tấn/sản phẩm"
            trend={0.8}
          />
          <article className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400">
              MỤC TIÊU GIẢM THẢI {year}
            </p>
            <p className="mt-2 text-[28px] font-bold leading-none text-slate-800">
              {goal}% <span className="text-[15px] font-medium text-slate-500">hoàn thành</span>
            </p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#3b82f6]" style={{ width: `${goal}%` }} />
            </div>
          </article>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <h3 className="text-[13px] font-bold tracking-[0.06em] text-slate-700">
              PHÂN BỐ NGUỒN PHÁT THẢI
            </h3>
            <Donut />
            <div className="mt-2 flex justify-center gap-6 text-[13px] text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-[2px] bg-[#22c55e]" />
                Trực tiếp (25%)
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-[2px] bg-[#3b82f6]" />
                Gián tiếp (75%)
              </span>
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <h3 className="text-[13px] font-bold tracking-[0.06em] text-slate-700">
              CHI TIẾT PHÁT THẢI (TẤN CO₂E)
            </h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wide text-slate-400">
                    <th className="py-2 font-semibold">HẠNG MỤC</th>
                    <th className="py-2 font-semibold">PHÂN LOẠI</th>
                    <th className="py-2 text-right font-semibold">GIÁ TRỊ (TẤN)</th>
                    <th className="py-2 text-right font-semibold">TỶ TRỌNG</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-50 ${source === row.id ? "bg-blue-50/70" : ""}`}
                    >
                      <td className="py-2.5 font-medium text-slate-700">{row.name}</td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            row.kind === "Gián tiếp"
                              ? "bg-blue-50 text-[#2563eb]"
                              : "bg-emerald-50 text-[#16a34a]"
                          }`}
                        >
                          {row.kind}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-700">{fmt(row.tons)}</td>
                      <td className="py-2.5 text-right font-semibold text-slate-700">
                        {row.share.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h4 className="mt-5 text-[12px] font-bold tracking-[0.06em] text-slate-500">
              BIỂU ĐỒ TỶ TRỌNG PHÁT THẢI
            </h4>
            <ul className="mt-3 space-y-3">
              {rows.map((row) => (
                <li key={row.id}>
                  <div className="mb-1 flex items-center justify-between text-[12px] text-slate-600">
                    <span>
                      {row.name} ({row.kind})
                    </span>
                    <span className="font-semibold">{row.share.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${row.share}%`,
                        backgroundColor: row.kind === "Gián tiếp" ? BLUE : GREEN,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string;
  hint: string;
  trend: number;
}) {
  const down = trend < 0;
  return (
    <article className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400">{label}</p>
      <p className="mt-2 text-[28px] font-bold leading-none text-slate-800">
        {value}
        <span className="ml-1.5 text-[13px] font-medium text-slate-400">{hint}</span>
      </p>
      <p className={`mt-3 inline-flex items-center gap-1 text-[12px] font-medium ${down ? "text-emerald-600" : "text-red-500"}`}>
        <TrendArrow down={down} />
        {down ? "" : "+"}
        {trend}% so với kỳ trước
      </p>
    </article>
  );
}

function Donut() {
  const r = 68;
  const c = 2 * Math.PI * r;
  const n = 8;
  const gap = 7;
  const seg = c / n - gap;
  const colors = [...Array.from({ length: 6 }, () => BLUE), ...Array.from({ length: 2 }, () => GREEN)];

  return (
    <div className="relative mx-auto mt-4 h-[220px] w-[220px]">
      <svg viewBox="0 0 180 180" className="h-full w-full">
        {colors.map((color, i) => (
          <circle
            key={i}
            cx="90"
            cy="90"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="26"
            strokeDasharray={`${seg} ${c - seg}`}
            strokeDashoffset={-i * (c / n) - gap / 2}
            transform="rotate(-90 90 90)"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[28px] font-bold leading-none text-slate-800">100%</p>
        <p className="mt-1 text-[11px] font-semibold tracking-[0.12em] text-slate-400">TỔNG CỘNG</p>
      </div>
    </div>
  );
}

function Accordion({
  label,
  open,
  onToggle,
  active,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-9 w-full items-center justify-between rounded-md px-3 text-left text-[13px] font-semibold ${
          active ? "bg-[#3b82f6] text-white" : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        {label}
        <Chevron className={`h-3.5 w-3.5 ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="mt-1 px-1">{children}</div> : null}
    </div>
  );
}

function SideItem({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-0.5 flex h-8 w-full items-center rounded-md px-3 text-left text-[13px] ${
        active ? "bg-[#3b82f6] font-medium text-white" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function TrendArrow({ down }: { down: boolean }) {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
      <path
        d={down ? "M6 2.5v7M3.5 6.5 6 9.5 8.5 6.5" : "M6 9.5v-7M3.5 5.5 6 2.5 8.5 5.5"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
