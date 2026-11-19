export type AdminNotificationType =
  | "project_created"
  | "project_updated"
  | "project_deleted"
  | "meter_replaced";

export type AdminNotification = {
  id: string;
  type: AdminNotificationType;
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
};

const STORAGE_KEY = "ems-admin-notifications-v1";
const CHANGE_EVENT = "ems-admin-notifications-changed";
const MAX_ITEMS = 50;

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function emitChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
}

function readAll(): AdminNotification[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AdminNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: AdminNotification[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  emitChange();
}

export function loadAdminNotifications() {
  return readAll();
}

export function unreadAdminNotificationCount(items: AdminNotification[] = readAll()) {
  return items.filter((item) => !item.read).length;
}

export function pushAdminNotification(input: {
  type: AdminNotificationType;
  title: string;
  body: string;
  href?: string;
}) {
  const next: AdminNotification = {
    id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href,
    createdAt: new Date().toISOString(),
    read: false,
  };
  writeAll([next, ...readAll()]);
  return next;
}

export function markAdminNotificationsRead(ids?: string[]) {
  const all = readAll();
  const idSet = ids ? new Set(ids) : null;
  writeAll(
    all.map((item) =>
      !idSet || idSet.has(item.id) ? { ...item, read: true } : item,
    ),
  );
}

export function clearAdminNotifications() {
  writeAll([]);
}

export function notifyProjectCreated(project: { id: string; name: string }) {
  return pushAdminNotification({
    type: "project_created",
    title: "Khởi tạo dự án",
    body: `Đã tạo dự án ${project.name} (${project.id}).`,
    href: `/chinh-sua-du-an/${encodeURIComponent(project.id)}`,
  });
}

export function notifyProjectUpdated(project: { id: string; name: string }) {
  return pushAdminNotification({
    type: "project_updated",
    title: "Cập nhật dự án",
    body: `Đã cập nhật dự án ${project.name} (${project.id}).`,
    href: `/chinh-sua-du-an/${encodeURIComponent(project.id)}`,
  });
}

export function notifyProjectDeleted(project: { id: string; name?: string }) {
  return pushAdminNotification({
    type: "project_deleted",
    title: "Xóa dự án",
    body: project.name
      ? `Đã xóa dự án ${project.name} (${project.id}).`
      : `Đã xóa dự án ${project.id}.`,
  });
}

export function notifyMeterReplaced(input: {
  projectId: string;
  meterName: string;
  oldSerial: string;
  newSerial: string;
  lastReadingKwh: number;
}) {
  return pushAdminNotification({
    type: "meter_replaced",
    title: "Thay đồng hồ",
    body: `${input.meterName}: ${input.oldSerial} → ${input.newSerial} (offset ${input.lastReadingKwh.toFixed(3)} kWh).`,
    href: `/chinh-sua-du-an/${encodeURIComponent(input.projectId)}`,
  });
}

export function subscribeAdminNotifications(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function formatNotificationTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
