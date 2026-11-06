export type ChartRange = { start: number; end: number };

export function clampRange(start: number, end: number, last: number, minSpan: number): ChartRange {
  const max = Math.max(0, last);
  const spanMin = Math.max(1, Math.min(minSpan, max));
  let s = Math.max(0, Math.min(Math.round(start), max));
  let e = Math.max(0, Math.min(Math.round(end), max));
  if (e < s) {
    const tmp = s;
    s = e;
    e = tmp;
  }
  if (e - s < spanMin) {
    const mid = Math.round((s + e) / 2);
    s = Math.max(0, mid - Math.floor(spanMin / 2));
    e = Math.min(max, s + spanMin);
    s = Math.max(0, e - spanMin);
  }
  return { start: s, end: e };
}

/** factor < 1 phóng to, factor > 1 thu nhỏ; giữ focusIndex ở cùng vị trí tương đối trong khung. */
export function zoomAround(
  range: ChartRange,
  focusIndex: number | null,
  factor: number,
  last: number,
  minSpan: number,
): ChartRange {
  const max = Math.max(0, last);
  const span = Math.max(range.end - range.start, 1);
  const nextSpan = Math.max(minSpan, Math.min(max, Math.round(span * factor)));
  if (nextSpan >= max) return { start: 0, end: max };
  const focus =
    focusIndex == null
      ? Math.round((range.start + range.end) / 2)
      : Math.max(0, Math.min(max, Math.round(focusIndex)));
  const t = (focus - range.start) / span;
  const start = Math.round(focus - t * nextSpan);
  return clampRange(start, start + nextSpan, max, minSpan);
}

export function indexAtClientX(
  clientX: number,
  box: DOMRect,
  range: ChartRange,
): number {
  if (box.width <= 0) return range.start;
  const t = Math.max(0, Math.min(1, (clientX - box.left) / box.width));
  return Math.round(range.start + t * (range.end - range.start));
}
