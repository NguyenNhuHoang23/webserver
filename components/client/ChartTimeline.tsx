"use client";

import { useRef } from "react";

export type ChartRange = { start: number; end: number };

export function ChartTimeline({
  labels,
  values,
  range,
  onRange,
}: {
  labels: string[];
  values: number[];
  range: ChartRange;
  onRange: (range: ChartRange) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<"start" | "end" | "move" | null>(null);
  const origin = useRef({ x: 0, start: 0, end: 0 });
  const last = Math.max(labels.length - 1, 0);
  const minSpan = last <= 0 ? 0 : Math.max(1, Math.min(3, last));
  const maxVal = Math.max(1, ...values);
  const left = last === 0 ? 0 : range.start / last;
  const right = last === 0 ? 1 : range.end / last;
  const startLabel = labels[range.start] ?? labels[0] ?? "--";
  const endLabel = labels[range.end] ?? labels[last] ?? "--";

  const toIndex = (clientX: number) => {
    const box = trackRef.current?.getBoundingClientRect();
    if (!box || box.width <= 0) return 0;
    const t = (clientX - box.left) / box.width;
    return Math.round(Math.max(0, Math.min(1, t)) * last);
  };

  const applyDrag = (clientX: number) => {
    if (!drag.current) return;
    const idx = toIndex(clientX);
    if (drag.current === "start") {
      onRange({ start: Math.min(idx, range.end - minSpan), end: range.end });
      return;
    }
    if (drag.current === "end") {
      onRange({ start: range.start, end: Math.max(idx, range.start + minSpan) });
      return;
    }
    const delta = idx - toIndex(origin.current.x);
    const span = origin.current.end - origin.current.start;
    const start = Math.max(0, Math.min(last - span, origin.current.start + delta));
    onRange({ start, end: start + span });
  };

  const shiftWindow = (step: number) => {
    const span = range.end - range.start;
    const start = Math.max(0, Math.min(last - span, range.start + step));
    onRange({ start, end: start + span });
  };

  const spark = values
    .map((value, index) => {
      const x = last === 0 ? 0 : (index / last) * 100;
      const y = 100 - (value / maxVal) * 86 - 7;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 sm:px-3">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500">
          KÉO THANH ĐỂ CHỌN KHOẢNG THỜI GIAN
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Lùi khoảng xem"
            onClick={() => shiftWindow(-minSpan)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          >
            ‹
          </button>
          <span className="min-w-[9.5rem] text-center text-[12px] font-semibold text-slate-800">
            {startLabel} → {endLabel}
          </span>
          <button
            type="button"
            aria-label="Tới khoảng xem"
            onClick={() => shiftWindow(minSpan)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => onRange({ start: 0, end: last })}
            className="ml-1 h-7 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
          >
            Toàn bộ
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="relative h-14 w-full touch-none select-none overflow-hidden rounded-lg bg-white ring-1 ring-slate-200"
        onPointerDown={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - box.left;
          const leftX = left * box.width;
          const rightX = right * box.width;
          const edge = 16;
          if (Math.abs(x - leftX) <= edge) drag.current = "start";
          else if (Math.abs(x - rightX) <= edge) drag.current = "end";
          else if (x > leftX && x < rightX) drag.current = "move";
          else drag.current = x < leftX ? "start" : "end";
          origin.current = { x: event.clientX, start: range.start, end: range.end };
          event.currentTarget.setPointerCapture(event.pointerId);
          applyDrag(event.clientX);
        }}
        onPointerMove={(event) => applyDrag(event.clientX)}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {spark ? (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <path d={`${spark} L 100 100 L 0 100 Z`} fill="#dbeafe" />
            <path d={spark} fill="none" stroke="#60a5fa" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : null}

        <div className="pointer-events-none absolute inset-y-0 bg-slate-200/55" style={{ left: 0, width: `${left * 100}%` }} />
        <div
          className="pointer-events-none absolute inset-y-0 bg-slate-200/55"
          style={{ left: `${right * 100}%`, right: 0 }}
        />
        <div
          className="absolute inset-y-0 border-y-2 border-emerald-500 bg-emerald-500/15"
          style={{ left: `${left * 100}%`, width: `${Math.max((right - left) * 100, 2)}%` }}
        >
          <span className="absolute top-0 bottom-0 left-0 w-3 cursor-ew-resize rounded-l-md bg-emerald-600" />
          <span className="absolute top-0 bottom-0 right-0 w-3 cursor-ew-resize rounded-r-md bg-emerald-600" />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-emerald-900/80">
            Kéo
          </span>
        </div>
      </div>
    </div>
  );
}
