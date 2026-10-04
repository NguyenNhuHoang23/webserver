export type ProjectGatewaySample = {
  meterPointId: string;
  at: string;
  values: Record<string, number>;
};

export type ChartSample = {
  values: Record<string, number>;
};

export async function loadProjectGatewaySamples(projectId: string): Promise<ProjectGatewaySample[]> {
  try {
    const response = await fetch(`/api/gateway/series?projectId=${encodeURIComponent(projectId)}`, {
      cache: "no-store",
    });
    if (!response.ok) return [];
    const body = (await response.json()) as ProjectGatewaySample[];
    return Array.isArray(body) ? body : [];
  } catch {
    return [];
  }
}

export function valuesForKey(samples: ChartSample[] | undefined, key: string, length: number): number[] | null {
  if (!samples?.length || length < 1) return null;
  const nums = samples
    .map((sample) => sample.values[key])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!nums.length) return null;
  if (nums.length === 1) return Array.from({ length }, () => nums[0]);
  return Array.from({ length }, (_, index) => {
    const pos = (index / Math.max(length - 1, 1)) * (nums.length - 1);
    const low = Math.floor(pos);
    const high = Math.min(nums.length - 1, low + 1);
    const blend = pos - low;
    return nums[low] * (1 - blend) + nums[high] * blend;
  });
}

export function valuesForKeysAverage(
  samples: ChartSample[] | undefined,
  keys: string[],
  length: number,
): number[] | null {
  if (!samples?.length) return null;
  const series = keys
    .map((key) => valuesForKey(samples, key, length))
    .filter((item): item is number[] => item != null);
  if (!series.length) return null;
  return Array.from({ length }, (_, index) => {
    const nums = series.map((item) => item[index]);
    return nums.reduce((sum, value) => sum + value, 0) / nums.length;
  });
}

export function latestValue(samples: ChartSample[] | undefined, key: string): number | null {
  if (!samples?.length) return null;
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const value = samples[index].values[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

export function paddedDomain(series: { values: number[] }[], fallback: [number, number]): [number, number] {
  const nums = series.flatMap((item) => item.values).filter((value) => Number.isFinite(value));
  if (!nums.length) return fallback;
  let min = Math.min(...nums);
  let max = Math.max(...nums);
  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.01, 0.05);
    return [min - pad, max + pad];
  }
  const pad = (max - min) * 0.12;
  return [min - pad, max + pad];
}

export function domainTicks(domain: [number, number], count = 5): number[] {
  const [min, max] = domain;
  const span = max - min;
  const digits = span >= 100 ? 0 : span >= 10 ? 1 : span >= 1 ? 2 : 3;
  const factor = 10 ** digits;
  const round = (value: number) => Math.round(value * factor) / factor;
  if (!(max > min)) return [round(min)];
  const steps = Math.max(count, 2);
  return Array.from({ length: steps }, (_, index) => round(min + (span * index) / (steps - 1)));
}
