import { dbFetch } from "@/lib/db-client";

export type MeterReading = {
  id: number;
  meterPointId: string;
  recordedAt: string;
  metric: string;
  value: number;
  unit?: string;
  quality: string;
  code?: string;
  name?: string;
  utility?: string;
};

const cache: Record<string, MeterReading[]> = {};
const hydration: Record<string, Promise<MeterReading[]> | undefined> = {};

export function loadMeterReadings(projectId: string) {
  return cache[projectId] ?? [];
}

export function hydrateMeterReadings(projectId: string) {
  if (typeof window === "undefined") return Promise.resolve(loadMeterReadings(projectId));
  if (!hydration[projectId]) {
    hydration[projectId] = dbFetch<MeterReading[]>("meter-readings", { query: { projectId } })
      .then((readings) => {
        cache[projectId] = readings;
        return readings;
      })
      .finally(() => {
        hydration[projectId] = undefined;
      });
  }
  return hydration[projectId]!;
}
