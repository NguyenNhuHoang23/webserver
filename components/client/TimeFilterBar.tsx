"use client";

import { useMemo, useState } from "react";

export type TimeFilterMode = "day" | "month" | "year" | "custom_date" | "date_range";

export type TimeFilterValue = {
  mode: TimeFilterMode;
  date: string;       // YYYY-MM-DD
  month: string;      // YYYY-MM
  year: number;       // YYYY
  customDate: string; // YYYY-MM-DD
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
};

export const DEFAULT_TIME_FILTER: TimeFilterValue = {
  mode: "month",
  date: "2026-09-12",
  month: "2026-09",
  year: 2026,
  customDate: "2026-09-12",
  startDate: "2026-09-01",
  endDate: "2026-09-12",
};

export function getTimeFilterLabel(value: TimeFilterValue): string {
  switch (value.mode) {
    case "day":
      return `Hôm nay (${value.date})`;
    case "custom_date":
      return `Ngày ${value.customDate}`;
    case "month": {
      const [y, m] = value.month.split("-");
      return `Tháng ${m}/${y}`;
    }
    case "year":
      return `Năm ${value.year}`;
    case "date_range":
      return `${value.startDate} đến ${value.endDate}`;
    default:
      return "";
  }
}

export function getTimeFilterPeriods(value: TimeFilterValue): { key: string | number; label: string }[] {
  if (value.mode === "day" || value.mode === "custom_date") {
    return Array.from({ length: 24 }, (_, i) => ({
      key: i,
      label: `${String(i).padStart(2, "0")}:00`,
    }));
  }

  if (value.mode === "month") {
    const [y, m] = value.month.split("-").map(Number);
    const count = new Date(y, m, 0).getDate();
    return Array.from({ length: count }, (_, i) => ({
      key: i + 1,
      label: `${String(i + 1).padStart(2, "0")}/${String(m).padStart(2, "0")}`,
    }));
  }

  if (value.mode === "year") {
    return Array.from({ length: 12 }, (_, i) => ({
      key: i + 1,
      label: `T${i + 1}`,
    }));
  }

  if (value.mode === "date_range") {
    const start = new Date(value.startDate);
    const end = new Date(value.endDate);
    const diffMs = Math.max(0, end.getTime() - start.getTime());
    const diffDays = Math.min(31, Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1));
    
    return Array.from({ length: diffDays }, (_, i) => {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dayStr = String(d.getDate()).padStart(2, "0");
      const monStr = String(d.getMonth() + 1).padStart(2, "0");
      return {
        key: i,
        label: `${dayStr}/${monStr}`,
      };
    });
  }

  return [];
}

export function getTimeFilterScaleFactor(value: TimeFilterValue): number {
  switch (value.mode) {
    case "year":
      return 1.0;
    case "month":
      return 1 / 12;
    case "day":
    case "custom_date":
      return 1 / 365;
    case "date_range": {
      const start = new Date(value.startDate);
      const end = new Date(value.endDate);
      const diffMs = Math.max(0, end.getTime() - start.getTime());
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
      return diffDays / 365;
    }
    default:
      return 1.0;
  }
}

export function TimeFilterBar({
  value,
  onChange,
  className = "",
}: {
  value: TimeFilterValue;
  onChange: (next: TimeFilterValue) => void;
  className?: string;
}) {
  const modes: { id: TimeFilterMode; label: string }[] = [
    { id: "day", label: "Ngày" },
    { id: "month", label: "Tháng" },
    { id: "year", label: "Năm" },
    { id: "custom_date", label: "Ngày tự chọn" },
    { id: "date_range", label: "Khoảng ngày" },
  ];

  const years = useMemo(() => [2023, 2024, 2025, 2026, 2027], []);

  return (
    <div className={`flex flex-wrap items-center gap-2.5 font-sans ${className}`}>
      {/* Segmented Mode Tabs */}
      <div className="inline-flex rounded-xl border border-slate-200/90 bg-white p-1 shadow-xs">
        {modes.map((item) => {
          const active = value.mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange({ ...value, mode: item.id })}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                active
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Dynamic Selector Input based on active mode */}
      <div className="inline-flex items-center">
        {value.mode === "day" && (
          <div className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-xs">
            <CalendarSmallIcon className="h-3.5 w-3.5 text-emerald-600" />
            <span>Hôm nay: <strong className="font-mono text-slate-900">{value.date}</strong></span>
          </div>
        )}

        {value.mode === "month" && (
          <label className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-xs hover:border-slate-300 transition-colors cursor-pointer">
            <CalendarSmallIcon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="text-slate-500">Tháng:</span>
            <input
              type="month"
              value={value.month}
              onChange={(e) => onChange({ ...value, month: e.target.value })}
              className="border-0 bg-transparent text-xs font-semibold text-slate-900 outline-none cursor-pointer [color-scheme:light]"
            />
          </label>
        )}

        {value.mode === "year" && (
          <div className="relative">
            <select
              value={value.year}
              onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
              className="h-9 appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-900 shadow-xs outline-none hover:border-slate-300 focus:border-emerald-500 cursor-pointer transition-colors"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              ▾
            </span>
          </div>
        )}

        {value.mode === "custom_date" && (
          <label className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-xs hover:border-slate-300 transition-colors cursor-pointer">
            <CalendarSmallIcon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="text-slate-500">Ngày chọn:</span>
            <input
              type="date"
              value={value.customDate}
              onChange={(e) => onChange({ ...value, customDate: e.target.value })}
              className="border-0 bg-transparent text-xs font-semibold text-slate-900 outline-none cursor-pointer [color-scheme:light]"
            />
          </label>
        )}

        {value.mode === "date_range" && (
          <div className="flex flex-wrap items-center gap-1.5">
            <label className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-xs hover:border-slate-300 transition-colors cursor-pointer">
              <span className="text-slate-400">Từ:</span>
              <input
                type="date"
                value={value.startDate}
                onChange={(e) => onChange({ ...value, startDate: e.target.value })}
                className="border-0 bg-transparent text-xs font-semibold text-slate-900 outline-none cursor-pointer [color-scheme:light]"
              />
            </label>
            <span className="text-slate-400 text-xs font-bold">→</span>
            <label className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-xs hover:border-slate-300 transition-colors cursor-pointer">
              <span className="text-slate-400">Đến:</span>
              <input
                type="date"
                value={value.endDate}
                onChange={(e) => onChange({ ...value, endDate: e.target.value })}
                className="border-0 bg-transparent text-xs font-semibold text-slate-900 outline-none cursor-pointer [color-scheme:light]"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarSmallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
