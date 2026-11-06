"use client";

import { chartTimeLabel, type ChartSample } from "@/lib/gateway-series";

export type ChartTableSeries = {
  key: string;
  name: string;
  color?: string;
  values: number[];
  digits?: number;
};

export function ChartDataTable({
  samples,
  length,
  range,
  series,
  emptyText = "Không có dữ liệu trong khoảng đang xem.",
}: {
  samples?: ChartSample[];
  length: number;
  range: { start: number; end: number };
  series: ChartTableSeries[];
  emptyText?: string;
}) {
  const start = Math.max(0, range.start);
  const end = Math.min(length - 1, range.end);
  const rows: number[] = [];
  for (let i = start; i <= end; i += 1) rows.push(i);

  if (!series.length || rows.length === 0) {
    return (
      <div className="rounded-[2px] border border-slate-300 bg-white px-4 py-10 text-center text-[12px] text-slate-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2px] border border-slate-400 bg-white">
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-[12px]">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="border-b border-slate-200 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              <th className="whitespace-nowrap px-3 py-2.5">Ngày giờ</th>
              {series.map((item) => (
                <th key={item.key} className="whitespace-nowrap px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 normal-case tracking-normal">
                    {item.color ? (
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    ) : null}
                    {item.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((index) => {
              const stamp =
                chartTimeLabel(samples, index, length, "tooltip") ||
                chartTimeLabel(samples, index, length, "full") ||
                `#${index + 1}`;
              return (
                <tr key={index} className="border-b border-slate-100 text-slate-700 odd:bg-white even:bg-slate-50/50">
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px] text-slate-600">{stamp}</td>
                  {series.map((item) => {
                    const value = item.values[index];
                    const digits = item.digits ?? (Math.abs(value) < 10 ? 3 : 2);
                    return (
                      <td key={`${item.key}-${index}`} className="whitespace-nowrap px-3 py-1.5 font-mono tabular-nums">
                        {Number.isFinite(value) ? value.toFixed(digits) : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
        Hiển thị {rows.length} mẫu trong khoảng đang xem
      </div>
    </div>
  );
}

export function TableToolIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 10h16M10 5v14" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

/** Nút bảng dữ liệu góc phải vùng tiêu đề card. */
export function ChartTableToggle({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={active ? "Xem biểu đồ" : "Bảng dữ liệu"}
      aria-label={active ? "Xem biểu đồ" : "Bảng dữ liệu"}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors ${
        active
          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      }`}
    >
      <TableToolIcon />
    </button>
  );
}
