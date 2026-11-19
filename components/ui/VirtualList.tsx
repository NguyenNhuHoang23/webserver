"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";

type VirtualListProps = {
  count: number;
  rowHeight: number;
  height: number;
  overscan?: number;
  className?: string;
  renderRow: (index: number) => ReactNode;
};

/** Danh sách ảo hóa đơn giản — chỉ render hàng trong viewport (+ overscan). */
export function VirtualList({
  count,
  rowHeight,
  height,
  overscan = 6,
  className,
  renderRow,
}: VirtualListProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const { start, end, offsetY, totalHeight } = useMemo(() => {
    const visible = Math.ceil(height / rowHeight) + overscan * 2;
    const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const last = Math.min(count, first + visible);
    return {
      start: first,
      end: last,
      offsetY: first * rowHeight,
      totalHeight: count * rowHeight,
    };
  }, [count, height, overscan, rowHeight, scrollTop]);

  if (count <= 0) return <div className={className} style={{ height }} />;

  const indexes = Array.from({ length: end - start }, (_, i) => start + i);

  return (
    <div
      ref={ref}
      className={className}
      style={{ height, overflowY: "auto" }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {indexes.map((index) => (
            <div key={index} style={{ height: rowHeight }}>
              {renderRow(index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
