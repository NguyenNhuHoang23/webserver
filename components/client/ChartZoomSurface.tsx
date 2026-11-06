"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  clampRange,
  indexAtClientX,
  zoomAround,
  type ChartRange,
} from "@/components/client/chartZoom";

const DRAG_THRESHOLD_PX = 8;
const WHEEL_IN = 0.82;
const WHEEL_OUT = 1.22;

export function ChartZoomSurface({
  range,
  onRange,
  lastIndex,
  minSpan = 32,
  children,
  className,
}: {
  range: ChartRange;
  onRange: (range: ChartRange) => void;
  lastIndex: number;
  minSpan?: number;
  children: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef(range);
  const onRangeRef = useRef(onRange);
  const lastRef = useRef(lastIndex);
  const minSpanRef = useRef(minSpan);
  const drag = useRef<{ x0: number; x1: number; active: boolean } | null>(null);
  const [band, setBand] = useState<{ left: number; width: number } | null>(null);

  rangeRef.current = range;
  onRangeRef.current = onRange;
  lastRef.current = lastIndex;
  minSpanRef.current = minSpan;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = el.getBoundingClientRect();
      const focus = indexAtClientX(event.clientX, box, rangeRef.current);
      const factor = event.deltaY < 0 ? WHEEL_IN : WHEEL_OUT;
      onRangeRef.current(
        zoomAround(rangeRef.current, focus, factor, lastRef.current, minSpanRef.current),
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const fit = () => onRange({ start: 0, end: lastIndex });

  const bandFromPointer = (x0: number, x1: number) => {
    const box = rootRef.current?.getBoundingClientRect();
    if (!box || box.width <= 0) return null;
    const a = Math.max(0, Math.min(box.width, x0 - box.left));
    const b = Math.max(0, Math.min(box.width, x1 - box.left));
    const left = Math.min(a, b);
    const width = Math.abs(b - a);
    return { left, width };
  };

  return (
    <div
      ref={rootRef}
      className={`relative touch-none ${className ?? ""}`}
      onDoubleClick={(event) => {
        event.preventDefault();
        fit();
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        drag.current = { x0: event.clientX, x1: event.clientX, active: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        drag.current.x1 = event.clientX;
        const moved = Math.abs(drag.current.x1 - drag.current.x0);
        if (moved >= DRAG_THRESHOLD_PX) {
          drag.current.active = true;
          setBand(bandFromPointer(drag.current.x0, drag.current.x1));
        }
      }}
      onPointerUp={(event) => {
        const state = drag.current;
        drag.current = null;
        setBand(null);
        if (!state?.active) return;
        const box = rootRef.current?.getBoundingClientRect();
        if (!box) return;
        const a = indexAtClientX(state.x0, box, range);
        const b = indexAtClientX(state.x1, box, range);
        onRange(clampRange(Math.min(a, b), Math.max(a, b), lastIndex, minSpan));
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          /* already released */
        }
      }}
      onPointerCancel={() => {
        drag.current = null;
        setBand(null);
      }}
    >
      {children}
      {band && band.width > 0 ? (
        <div
          className="pointer-events-none absolute inset-y-0 z-10 border border-emerald-500/80 bg-emerald-500/15"
          style={{ left: band.left, width: band.width }}
        />
      ) : null}
    </div>
  );
}

export const CHART_ZOOM_HINT = "Lăn chuột / kéo chọn vùng để zoom · Double-click vừa khung";
