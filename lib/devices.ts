import { dbFetch, emitDbChange } from "@/lib/db-client";
import { vietnamNowLabel } from "@/lib/vietnam-time";

export type DeviceKind = "power" | "flow" | "temp" | "steam";
export type DeviceStatus = "active" | "maintenance" | "offline";

export type DeviceRegister = {
  id: string;
  address: string;
  name: string;
  dataType: string;
  multiplier: string;
};

export type DeviceExtraField = {
  id: string;
  label: string;
  value: string;
};

export type CatalogDevice = {
  id: string;
  name: string;
  sn: string;
  brandModel: string;
  brand: string;
  type: string;
  category?: string;
  kind: DeviceKind;
  status: DeviceStatus;
  lastSync: string;
  protocol?: string;
  notes?: string;
  image?: string;
  extraFields?: DeviceExtraField[];
  registers?: DeviceRegister[];
};

let devicesCache: CatalogDevice[] = [];
let devicesHydration: Promise<CatalogDevice[]> | null = null;

export function deviceSpec(device: CatalogDevice) {
  const protocol = device.protocol?.trim();
  return protocol ? `${protocol} • ${device.type}` : device.type;
}

export function loadDevices(): CatalogDevice[] {
  return devicesCache;
}

export function saveDevices(devices: CatalogDevice[]) {
  devicesCache = devices;
  emitDbChange("devices");
  return dbFetch("devices", {
    method: "POST",
    body: JSON.stringify({ items: devices }),
  }).catch((error) => {
    console.error("Không thể lưu thiết bị", error);
    throw error;
  });
}

export function hydrateDevices() {
  if (typeof window === "undefined") return Promise.resolve(loadDevices());
  if (devicesHydration) return devicesHydration;
  devicesHydration = dbFetch<CatalogDevice[]>("devices")
    .then((devices) => {
      devicesCache = devices;
      emitDbChange("devices");
      return devicesCache;
    })
    .finally(() => {
      devicesHydration = null;
    });
  return devicesHydration;
}

export async function upsertDevice(device: CatalogDevice) {
  const saved = await dbFetch<CatalogDevice[]>("devices", {
    method: "POST",
    body: JSON.stringify(device),
  });
  devicesCache = saved;
  emitDbChange("devices");
  return saved;
}

export async function removeDevice(id: string) {
  await dbFetch("devices", { method: "DELETE", query: { id } });
  const next = loadDevices().filter((item) => item.id !== id);
  devicesCache = next;
  emitDbChange("devices");
  return next;
}

export function todaySyncLabel() {
  return vietnamNowLabel();
}

export function kindFromDeviceType(deviceType: string): DeviceKind {
  const value = deviceType.toLowerCase();
  if (value.includes("nước") || value.includes("water") || value.includes("flow")) {
    return "flow";
  }
  if (value.includes("nhiệt") || value.includes("temp")) return "temp";
  if (value.includes("hơi") || value.includes("steam")) return "steam";
  return "power";
}

export function typeLabelFromDeviceType(deviceType: string) {
  return deviceType.trim() || "Chưa phân loại";
}
