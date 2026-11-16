"use client";

import { useEffect, useRef, useState } from "react";
import {
  civilDatePart,
  civilTimePart,
  formatCivilDate,
  formatCivilDateTime,
  toCivilDateTime,
  vietnamFromStored,
  vietnamNow,
} from "@/lib/vietnam-time";

export type TimeFilterMode = "day" | "month" | "year" | "custom_date";
export type CustomDateMode = "single" | "range";

export type TimeFilterValue = {
  mode: TimeFilterMode;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  year: number; // YYYY
  customDateMode: CustomDateMode;
  /** YYYY-MM-DD hoặc YYYY-MM-DDTHH:mm */
  customDate: string;
  /** YYYY-MM-DD hoặc YYYY-MM-DDTHH:mm */
  startDate: string;
  /** YYYY-MM-DD hoặc YYYY-MM-DDTHH:mm */
  endDate: string;
};

export function createTimeFilter(now = vietnamNow()): TimeFilterValue {
  const noon = `${now.date}T00:00`;
  return {
    mode: "month",
    date: now.date,
    month: now.monthKey,
    year: now.year,
    customDateMode: "range",
    customDate: noon,
    startDate: `${now.monthKey}-01T00:00`,
    endDate: `${now.date}T23:59`,
  };
}

export const DEFAULT_TIME_FILTER: TimeFilterValue = createTimeFilter();

function filterInstantMs(value: string) {
  const date = civilDatePart(value);
  const time = civilTimePart(value, "00:00");
  return Date.parse(`${date}T${time}:00+07:00`);
}

function orderedRange(value: TimeFilterValue) {
  const startMs = filterInstantMs(value.startDate);
  const endMs = filterInstantMs(value.endDate);
  if (startMs <= endMs) {
    return { from: value.startDate, to: value.endDate, fromMs: startMs, toMs: endMs };
  }
  return { from: value.endDate, to: value.startDate, fromMs: endMs, toMs: startMs };
}

export function periodIndexForInstant(value: TimeFilterValue, at: string, length: number) {
  const parts = vietnamFromStored(at);
  if (!parts) return -1;
  let index = -1;
  if (value.mode === "month") {
    if (parts.monthKey === value.month) index = parts.day - 1;
  } else if (value.mode === "year") {
    if (parts.year === value.year) index = parts.month - 1;
  } else if (value.mode === "day" && parts.date === value.date) {
    index = parts.hour;
  } else if (value.mode === "custom_date" && value.customDateMode !== "range") {
    if (parts.date === civilDatePart(value.customDate)) index = parts.hour;
  } else if (value.mode === "custom_date" && value.customDateMode === "range") {
    const { fromMs, toMs } = orderedRange(value);
    const currentMs = filterInstantMs(`${parts.date}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`);
    if (currentMs < fromMs || currentMs > toMs) return -1;
    const span = timeFilterSpan(value);
    if (span.hourly) {
      index = Math.floor((currentMs - fromMs) / (60 * 60 * 1000));
    } else {
      const startDay = Date.parse(`${civilDatePart(span.from)}T00:00:00+07:00`);
      const currentDay = Date.parse(`${parts.date}T00:00:00+07:00`);
      index = Math.round((currentDay - startDay) / (24 * 60 * 60 * 1000));
    }
  }
  return index >= 0 && index < length ? index : -1;
}

export function getTimeFilterLabel(value: TimeFilterValue): string {
  switch (value.mode) {
    case "day":
      return value.date === vietnamNow().date
        ? `Hôm nay (${formatCivilDate(value.date)})`
        : formatCivilDate(value.date);
    case "custom_date":
      return value.customDateMode === "range"
        ? `${formatCivilDateTime(value.startDate)} → ${formatCivilDateTime(value.endDate)}`
        : formatCivilDateTime(value.customDate);
    case "month": {
      const [y, m] = value.month.split("-");
      return `Tháng ${m}/${y}`;
    }
    case "year":
      return `Năm ${value.year}`;
    default:
      return "";
  }
}

export function getTimeFilterPeriods(value: TimeFilterValue): { key: string | number; label: string }[] {
  if (value.mode === "day" || (value.mode === "custom_date" && value.customDateMode !== "range")) {
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

  if (value.mode === "custom_date" && value.customDateMode === "range") {
    const span = timeFilterSpan(value);
    const { fromMs, toMs } = orderedRange(value);
    if (span.hourly) {
      const hours = Math.max(1, Math.min(168, Math.floor((toMs - fromMs) / (60 * 60 * 1000)) + 1));
      return Array.from({ length: hours }, (_, i) => {
        const t = new Date(fromMs + i * 60 * 60 * 1000);
        const label = new Intl.DateTimeFormat("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(t);
        return { key: i, label };
      });
    }

    const startDay = Date.parse(`${civilDatePart(span.from)}T00:00:00+07:00`);
    const endDay = Date.parse(`${civilDatePart(span.to)}T00:00:00+07:00`);
    const diffDays = Math.min(366, Math.max(1, Math.round((endDay - startDay) / (24 * 60 * 60 * 1000)) + 1));
    return Array.from({ length: diffDays }, (_, i) => {
      const d = new Date(startDay + i * 24 * 60 * 60 * 1000);
      const label = new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
      }).format(d);
      return { key: i, label };
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
      return 1 / 365;
    case "custom_date": {
      if (value.customDateMode !== "range") return 1 / 365;
      const { fromMs, toMs } = orderedRange(value);
      const diffDays = Math.max(1, (toMs - fromMs) / (1000 * 60 * 60 * 24));
      return diffDays / 365;
    }
    default:
      return 1.0;
  }
}

export function timeFilterSpan(value: TimeFilterValue): { from: string; to: string; hourly: boolean } {
  if (value.mode === "day") return { from: value.date, to: value.date, hourly: true };
  if (value.mode === "month") {
    const [year, month] = value.month.split("-").map(Number);
    if (!year || !month) {
      const now = vietnamNow();
      return { from: `${now.monthKey}-01`, to: now.date, hourly: false };
    }
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const mm = String(month).padStart(2, "0");
    return {
      from: `${year}-${mm}-01`,
      to: `${year}-${mm}-${String(last).padStart(2, "0")}`,
      hourly: false,
    };
  }
  if (value.mode === "year") return { from: `${value.year}-01-01`, to: `${value.year}-12-31`, hourly: false };
  if (value.mode === "custom_date" && value.customDateMode === "range") {
    const { from, to, fromMs, toMs } = orderedRange(value);
    const hours = (toMs - fromMs) / (60 * 60 * 1000);
    return {
      from: civilDatePart(from),
      to: civilDatePart(to),
      hourly: hours <= 48,
    };
  }
  return {
    from: civilDatePart(value.customDate),
    to: civilDatePart(value.customDate),
    hourly: true,
  };
}

export function shiftTimeFilter(value: TimeFilterValue, step: number): TimeFilterValue {
  if (value.mode === "day") return withCivilDate(value, shiftCivilDate(value.date, step));
  if (value.mode === "year") return { ...value, year: value.year + step };
  if (value.mode === "month") {
    const [year, month] = (/^\d{4}-\d{2}$/.test(value.month) ? value.month : vietnamNow().monthKey)
      .split("-")
      .map(Number);
    const next = new Date(Date.UTC(year, month - 1 + step, 1));
    const key = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
    return { ...value, month: key, year: next.getUTCFullYear() };
  }
  if (value.customDateMode === "range") {
    const { from, to, fromMs, toMs } = orderedRange(value);
    const spanMs = Math.max(60 * 60 * 1000, toMs - fromMs);
    const nextFromMs = fromMs + step * spanMs;
    const nextToMs = toMs + step * spanMs;
    const startDate = toCivilDateTime(
      new Date(nextFromMs).toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).replace(" ", "T").slice(0, 16),
    );
    const endDate = toCivilDateTime(
      new Date(nextToMs).toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).replace(" ", "T").slice(0, 16),
    );
    const startDay = civilDatePart(startDate);
    return {
      ...value,
      startDate,
      endDate,
      date: startDay,
      customDate: startDate,
      month: startDay.slice(0, 7),
      year: Number(startDay.slice(0, 4)),
    };
  }
  const shifted = shiftCivilDate(civilDatePart(value.customDate), step);
  const customDate = toCivilDateTime(shifted, civilTimePart(value.customDate));
  return withCivilDate({ ...value, customDate }, shifted);
}

function shiftCivilDate(value: string, days: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(civilDatePart(value));
  const base = match
    ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : Date.parse(`${vietnamNow().date}T00:00:00Z`);
  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function withCivilDate(value: TimeFilterValue, date: string): TimeFilterValue {
  const day = civilDatePart(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return value;
  return {
    ...value,
    date: day,
    month: day.slice(0, 7),
    year: Number(day.slice(0, 4)),
  };
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
    { id: "custom_date", label: "Tùy chọn" },
  ];

  return (
    <div className={`flex w-full flex-col gap-2 font-sans sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5 ${className}`}>
      <div className="inline-flex w-full max-w-full overflow-x-auto rounded-xl border border-slate-200/90 bg-white p-1 shadow-xs sm:w-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {modes.map((item) => {
          const active = value.mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange({ ...value, mode: item.id })}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all sm:px-3 ${
                active
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="flex w-full min-w-0 flex-nowrap items-center gap-1.5 sm:w-auto sm:flex-1">
        <button
          type="button"
          aria-label="Kỳ trước"
          onClick={() => onChange(shiftTimeFilter(value, -1))}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50"
        >
          ‹
        </button>
        <div className="min-w-0 flex-1 sm:flex-none">
          {value.mode === "day" && (
            <DayField
              date={/^\d{4}-\d{2}-\d{2}$/.test(value.date) ? value.date : vietnamNow().date}
              onChange={(date) => onChange(withCivilDate(value, date))}
            />
          )}

          {value.mode === "month" && (
            <MonthField
              month={/^\d{4}-\d{2}$/.test(value.month) ? value.month : vietnamNow().monthKey}
              onChange={(month) => onChange({ ...value, month, year: Number(month.slice(0, 4)) })}
            />
          )}

          {value.mode === "year" && (
            <YearField
              year={value.year || vietnamNow().year}
              onChange={(year) => onChange({ ...value, year })}
            />
          )}

          {value.mode === "custom_date" && (
            <DateSelectionControl
              mode={value.customDateMode}
              onModeChange={(customDateMode) => onChange({ ...value, customDateMode })}
              date={value.customDate}
              onDateChange={(customDate) =>
                onChange(withCivilDate({ ...value, customDate }, civilDatePart(customDate)))
              }
              startDate={value.startDate}
              endDate={value.endDate}
              onStartDateChange={(startDate) =>
                onChange(withCivilDate({ ...value, startDate }, civilDatePart(startDate)))
              }
              onEndDateChange={(endDate) =>
                onChange(withCivilDate({ ...value, endDate }, civilDatePart(endDate)))
              }
            />
          )}
        </div>
        <button
          type="button"
          aria-label="Kỳ sau"
          onClick={() => onChange(shiftTimeFilter(value, 1))}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50"
        >
          ›
        </button>
      </div>
    </div>
  );
}

export function DateSelectionControl({
  mode,
  onModeChange,
  date,
  onDateChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  compact = false,
}: {
  mode: CustomDateMode;
  onModeChange: (mode: CustomDateMode) => void;
  date: string;
  onDateChange: (date: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  compact?: boolean;
}) {
  const textClass = compact ? "text-[12px]" : "text-xs";
  const inputClass = compact
    ? "border-0 bg-transparent text-[12px] font-medium text-emerald-800 outline-none [color-scheme:light]"
    : "border-0 bg-transparent text-xs font-semibold text-slate-900 outline-none cursor-pointer [color-scheme:light]";

  return (
    <div
      className={`inline-flex min-h-9 w-full flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 sm:w-auto sm:px-3 sm:py-0 ${textClass} font-medium text-slate-700 shadow-xs transition-colors hover:border-slate-300`}
    >
      <CalendarSmallIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
      <span className="whitespace-nowrap text-slate-500">Tùy chọn:</span>
      <select
        value={mode}
        onChange={(e) => onModeChange(e.target.value as CustomDateMode)}
        className={`${textClass} cursor-pointer border-0 bg-transparent font-semibold text-slate-900 outline-none`}
      >
        <option value="single">Một mốc giờ</option>
        <option value="range">Khoảng giờ → ngày</option>
      </select>

      {mode === "single" ? (
        <VietnamDateTimeInput value={date} onChange={onDateChange} className={inputClass} />
      ) : (
        <>
          <span className="text-slate-400">Từ</span>
          <VietnamDateTimeInput
            value={startDate}
            max={endDate || undefined}
            onChange={onStartDateChange}
            className={inputClass}
          />
          <span className="text-slate-400">→</span>
          <span className="text-slate-400">Đến</span>
          <VietnamDateTimeInput
            value={endDate}
            min={startDate || undefined}
            onChange={onEndDateChange}
            className={inputClass}
          />
        </>
      )}
    </div>
  );
}

const MONTH_LABELS = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const periodTriggerClass =
  "inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 shadow-xs transition-colors hover:border-slate-300 sm:w-auto sm:justify-start";

function useDismissibleOpen(open: boolean, setOpen: (open: boolean) => void, rootRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, rootRef, setOpen]);
}

function DayField({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : vietnamNow().date;
  const [y, m, d] = safe.split("-").map(Number);
  const [viewYear, setViewYear] = useState(y);
  const [viewMonth, setViewMonth] = useState(m);
  useDismissibleOpen(open, setOpen, rootRef);

  useEffect(() => {
    if (!open) return;
    setViewYear(y);
    setViewMonth(m);
  }, [open, y, m]);

  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
  // Monday-first grid: UTC weekday 0=Sun → offset
  const firstWeekday = new Date(Date.UTC(viewYear, viewMonth - 1, 1)).getUTCDay();
  const leading = firstWeekday === 0 ? 6 : firstWeekday - 1;

  const shiftView = (delta: number) => {
    const next = new Date(Date.UTC(viewYear, viewMonth - 1 + delta, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth() + 1);
  };

  return (
    <div ref={rootRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="Chọn ngày"
        className={periodTriggerClass}
      >
        <CalendarSmallIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
        Ngày {String(d).padStart(2, "0")}/{String(m).padStart(2, "0")}/{y}
      </button>
      {open ? (
        <div className="absolute left-0 z-40 mt-1 w-[260px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:left-auto sm:right-0">
          <div className="mb-2 flex items-center justify-between">
            <StepButton label="Tháng trước" onClick={() => shiftView(-1)} />
            <span className="text-sm font-semibold text-slate-900">
              Tháng {String(viewMonth).padStart(2, "0")}/{viewYear}
            </span>
            <StepButton label="Tháng sau" onClick={() => shiftView(1)} />
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} className="text-center text-[10px] font-semibold text-slate-400">
                {label}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: leading }).map((_, index) => (
              <span key={`pad-${index}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const value = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const active = value === safe;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    onChange(value);
                    setOpen(false);
                  }}
                  className={`h-8 rounded-lg text-xs font-semibold ${
                    active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MonthField({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const year = Number(month.slice(0, 4)) || vietnamNow().year;
  const monthIndex = Number(month.slice(5, 7)) || vietnamNow().month;
  useDismissibleOpen(open, setOpen, rootRef);

  const choose = (nextYear: number, nextMonth: number) => {
    onChange(`${nextYear}-${String(nextMonth).padStart(2, "0")}`);
  };

  return (
    <div ref={rootRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="Chọn tháng"
        className={periodTriggerClass}
      >
        <CalendarSmallIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
        Tháng {String(monthIndex).padStart(2, "0")}/{year}
      </button>
      {open ? (
        <div className="absolute left-0 z-40 mt-1 w-[232px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:left-auto sm:right-0">
          <div className="mb-2 flex items-center justify-between">
            <StepButton label="Năm trước" onClick={() => choose(year - 1, monthIndex)} />
            <span className="text-sm font-semibold text-slate-900">{year}</span>
            <StepButton label="Năm sau" onClick={() => choose(year + 1, monthIndex)} />
          </div>
          <div className="grid grid-cols-3 gap-1">
            {MONTH_LABELS.map((label, index) => {
              const active = index + 1 === monthIndex;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    choose(year, index + 1);
                    setOpen(false);
                  }}
                  className={`h-8 rounded-lg text-xs font-semibold ${
                    active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function YearField({ year, onChange }: { year: number; onChange: (year: number) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const safeYear = Number.isFinite(year) ? year : vietnamNow().year;
  const [rangeStart, setRangeStart] = useState(safeYear - 4);
  useDismissibleOpen(open, setOpen, rootRef);

  useEffect(() => {
    if (!open) return;
    setRangeStart(safeYear - 4);
  }, [open, safeYear]);

  const years = Array.from({ length: 12 }, (_, index) => rangeStart + index);

  return (
    <div ref={rootRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="Chọn năm"
        className={periodTriggerClass}
      >
        <CalendarSmallIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
        Năm {safeYear}
      </button>
      {open ? (
        <div className="absolute left-0 z-40 mt-1 w-[232px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:left-auto sm:right-0">
          <div className="mb-2 flex items-center justify-between">
            <StepButton label="Kỳ trước" onClick={() => setRangeStart((current) => current - 12)} />
            <span className="text-sm font-semibold text-slate-900">
              {rangeStart}–{rangeStart + 11}
            </span>
            <StepButton label="Kỳ sau" onClick={() => setRangeStart((current) => current + 12)} />
          </div>
          <div className="grid grid-cols-3 gap-1">
            {years.map((item) => {
              const active = item === safeYear;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                  className={`h-8 rounded-lg text-xs font-semibold ${
                    active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StepButton({ label, onClick }: { label: string; onClick: () => void }) {
  const previous = label.includes("trước");
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    >
      {previous ? "‹" : "›"}
    </button>
  );
}

function VietnamDateInput({
  value,
  onChange,
  min,
  max,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const day = civilDatePart(value);
  return (
    <label
      className="relative inline-flex cursor-pointer items-center"
      onClick={(event) => {
        event.preventDefault();
        const input = inputRef.current;
        if (!input) return;
        try {
          input.showPicker();
        } catch {
          input.focus();
        }
      }}
    >
      <span className={className}>{formatCivilDate(day) || "Chọn ngày"}</span>
      <input
        ref={inputRef}
        type="date"
        value={day}
        min={min ? civilDatePart(min) : undefined}
        max={max ? civilDatePart(max) : undefined}
        aria-label="Chọn ngày"
        onChange={(event) => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) return;
          onChange(event.target.value);
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}

function VietnamDateTimeInput({
  value,
  onChange,
  min,
  max,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const local = toCivilDateTime(value, civilTimePart(value, "00:00"));
  return (
    <label
      className="relative inline-flex cursor-pointer items-center"
      onClick={(event) => {
        event.preventDefault();
        const input = inputRef.current;
        if (!input) return;
        try {
          input.showPicker();
        } catch {
          input.focus();
        }
      }}
    >
      <span className={className}>{formatCivilDateTime(local)}</span>
      <input
        ref={inputRef}
        type="datetime-local"
        value={local}
        min={min ? toCivilDateTime(min) : undefined}
        max={max ? toCivilDateTime(max) : undefined}
        step={60}
        aria-label="Chọn ngày giờ"
        onChange={(event) => {
          const next = event.target.value;
          if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(next)) return;
          onChange(next.slice(0, 16));
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
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
