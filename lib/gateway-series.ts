export type ProjectGatewaySample = {
  meterPointId: string;
  at: string;
  values: Record<string, number>;
};

export type ChartSample = {
  at?: string;
  values: Record<string, number>;
};

export type ChartTimeKind = "full" | "min" | "sec" | "tooltip";

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

function sampleTimes(samples: ChartSample[] | undefined) {
  const times: number[] = [];
  for (const sample of samples ?? []) {
    const match = sample.at?.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
    if (!match) continue;
    times.push(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6])));
  }
  return times;
}

function timeAtIndex(times: number[], index: number, length: number) {
  if (!times.length || length < 1) return null;
  if (times.length === 1) return times[0];
  const pos = (index / Math.max(length - 1, 1)) * (times.length - 1);
  const low = Math.floor(pos);
  const high = Math.min(times.length - 1, low + 1);
  const blend = pos - low;
  return times[low] * (1 - blend) + times[high] * blend;
}

export function chartTimeLabel(
  samples: ChartSample[] | undefined,
  index: number,
  length: number,
  kind: ChartTimeKind,
) {
  const time = timeAtIndex(sampleTimes(samples), index, length);
  if (time == null) return "";
  const date = new Date(time);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");
  if (kind === "tooltip") return `${date.getUTCFullYear()}-${month}-${day} ${hour}:${minute}:${second}`;
  if (kind === "sec") return `${hour}:${minute}:${second}`;
  return `${month}-${day} ${hour}:${minute}`;
}

export function chartTimeTicks(start: number, end: number, count = 6) {
  const span = Math.max(0, end - start);
  const steps = Math.min(count, span + 1);
  if (steps <= 1) return [{ i: start, kind: "full" as const }];
  const ticks: { i: number; kind: "full" | "min" }[] = [];
  for (let step = 0; step < steps; step += 1) {
    ticks.push({
      i: Math.round(start + (span * step) / (steps - 1)),
      kind: step === 0 ? "full" : "min",
    });
  }
  return ticks;
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
