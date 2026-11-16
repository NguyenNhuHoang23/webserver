import { dbFetch, emitDbChange } from "@/lib/db-client";

/** Trạng thái gửi tin qua kênh thông báo. */
export type AlertDeliveryStatus = "sent" | "failed" | "pending";

export type AlertDelivery = {
  email: AlertDeliveryStatus;
  zalo: AlertDeliveryStatus;
  telegram: AlertDeliveryStatus;
};

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
  /** Trạng thái gửi Email / Zalo / Telegram. */
  delivery?: AlertDelivery;
  emailStatus?: AlertDeliveryStatus | null;
  zaloStatus?: AlertDeliveryStatus | null;
  telegramStatus?: AlertDeliveryStatus | null;
};

const cache: Record<string, AlertEvent[]> = {};
const hydration: Record<string, Promise<AlertEvent[]> | undefined> = {};

export function normalizeDeliveryStatus(value: unknown): AlertDeliveryStatus {
  if (value === "sent" || value === "failed") return value;
  return "pending";
}

export function alertDelivery(event: Pick<AlertEvent, "delivery" | "emailStatus" | "zaloStatus" | "telegramStatus">): AlertDelivery {
  if (event.delivery) {
    return {
      email: normalizeDeliveryStatus(event.delivery.email),
      zalo: normalizeDeliveryStatus(event.delivery.zalo),
      telegram: normalizeDeliveryStatus(event.delivery.telegram),
    };
  }
  return {
    email: normalizeDeliveryStatus(event.emailStatus),
    zalo: normalizeDeliveryStatus(event.zaloStatus),
    telegram: normalizeDeliveryStatus(event.telegramStatus),
  };
}

export function deliveryStatusLabel(status: AlertDeliveryStatus) {
  if (status === "sent") return "Đã gửi";
  if (status === "failed") return "Thất bại";
  return "Chưa gửi";
}

export function loadAlertEvents(projectId: string): AlertEvent[] {
  return cache[projectId] ?? [];
}

export function hydrateAlertEvents(projectId: string) {
  if (typeof window === "undefined") return Promise.resolve(loadAlertEvents(projectId));
  if (!hydration[projectId]) {
    hydration[projectId] = dbFetch<AlertEvent[]>("alert-events", { query: { projectId } })
      .then((events) => {
        cache[projectId] = Array.isArray(events)
          ? events.map((event) => ({ ...event, delivery: alertDelivery(event) }))
          : [];
        return cache[projectId];
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
    event.id === id ? { ...event, ...patch, delivery: alertDelivery({ ...event, ...patch }) } : event,
  );
  const events = await dbFetch<AlertEvent[]>("alert-events", {
    method: "POST",
    body: JSON.stringify({ projectId, id, ...patch }),
  });
  cache[projectId] = Array.isArray(events)
    ? events.map((event) => ({ ...event, delivery: alertDelivery(event) }))
    : [];
  emitDbChange("alert-events");
  return cache[projectId];
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
