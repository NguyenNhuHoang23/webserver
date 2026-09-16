import { dbFetch, emitDbChange } from "@/lib/db-client";

export type AlertEvent = {
  id: string;
  projectId: string;
  meterPointId?: string;
  occurredAt: string;
  parameter: string;
  value: number;
  unit?: string;
  severity: "critical" | "warning" | "info" | string;
  status: "open" | "active" | "acknowledged" | "resolved" | string;
  note?: string;
  category?: string;
  message?: string;
  thresholdValue?: number;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  pointCode?: string;
  pointName?: string;
  utility?: string;
};

const cache: Record<string, AlertEvent[]> = {};
const hydration: Record<string, Promise<AlertEvent[]> | undefined> = {};

export function loadAlertEvents(projectId: string): AlertEvent[] {
  return cache[projectId] ?? [];
}

export function hydrateAlertEvents(projectId: string) {
  if (typeof window === "undefined") return Promise.resolve(loadAlertEvents(projectId));
  if (!hydration[projectId]) {
    hydration[projectId] = dbFetch<AlertEvent[]>("alert-events", { query: { projectId } })
      .then((events) => {
        cache[projectId] = events;
        return events;
      })
      .finally(() => {
        hydration[projectId] = undefined;
      });
  }
  return hydration[projectId]!;
}

export async function updateAlertEvent(
  projectId: string,
  id: string,
  patch: Partial<AlertEvent>,
) {
  const current = loadAlertEvents(projectId);
  cache[projectId] = current.map((event) =>
    event.id === id ? { ...event, ...patch } : event,
  );
  const events = await dbFetch<AlertEvent[]>("alert-events", {
    method: "POST",
    body: JSON.stringify({ projectId, id, ...patch }),
  });
  cache[projectId] = events;
  emitDbChange("alert-events");
  return events;
}

export function alertStatus(status: AlertEvent["status"]): "active" | "acknowledged" | "resolved" {
  if (status === "resolved") return "resolved";
  if (status === "acknowledged") return "acknowledged";
  return "active";
}

export function alertCategory(parameter: string, category?: string) {
  if (category) return category;
  if (parameter.startsWith("F")) return "frequency";
  if (parameter.startsWith("U")) return "voltage";
  if (parameter.startsWith("I")) return "current";
  if (parameter.startsWith("P")) return "power";
  return "connectivity";
}
