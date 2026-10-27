"use client";

import { useEffect, useRef, useState } from "react";

export function useChartSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const width = Math.max(0, Math.round(el.clientWidth));
      const height = Math.max(0, Math.round(el.clientHeight));
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width: size.width, height: size.height };
}
