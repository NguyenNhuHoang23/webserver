export type DeviceKind = "power" | "flow" | "temp" | "steam";
export type DeviceStatus = "active" | "maintenance" | "offline";

export type CatalogDevice = {
  id: string;
  name: string;
  sn: string;
  brandModel: string;
  brand: string;
  type: string;
  kind: DeviceKind;
  status: DeviceStatus;
  lastSync: string;
  protocol?: string;
};

const STORAGE_KEY = "ems-devices";

const seeds: CatalogDevice[] = [
  {
    id: "dev-1",
    name: "Power Meter Main-01",
    sn: "SN: EM-992834-A",
    brandModel: "Schneider iEM3000",
    brand: "Schneider",
    type: "Power Meter",
    kind: "power",
    status: "active",
    lastSync: "10:45:22 24/05/2024",
    protocol: "Modbus RTU",
  },
  {
    id: "dev-2",
    name: "Water Flow Sensor-B2",
    sn: "SN: WF-112093-X",
    brandModel: "Siemens SITRANS F",
    brand: "Siemens",
    type: "Flow Meter",
    kind: "flow",
    status: "active",
    lastSync: "10:42:15 24/05/2024",
    protocol: "Modbus TCP",
  },
  {
    id: "dev-3",
    name: "Temp Probe Line-C",
    sn: "SN: TP-445021-Z",
    brandModel: "ABB SensyTemp",
    brand: "ABB",
    type: "Temperature",
    kind: "temp",
    status: "maintenance",
    lastSync: "09:12:01 24/05/2024",
    protocol: "M-Bus",
  },
  {
    id: "dev-4",
    name: "Steam Gauge High-P",
    sn: "SN: SG-778120-K",
    brandModel: "Yokogawa EJX",
    brand: "Yokogawa",
    type: "Steam Meter",
    kind: "steam",
    status: "active",
    lastSync: "Vừa xong",
    protocol: "Modbus TCP",
  },
  {
    id: "dev-5",
    name: "Power Meter Sub-02",
    sn: "SN: EM-883401-B",
    brandModel: "Schneider PM5100",
    brand: "Schneider",
    type: "Power Meter",
    kind: "power",
    status: "offline",
    lastSync: "18:20:44 23/05/2024",
    protocol: "Modbus TCP",
  },
  {
    id: "dev-6",
    name: "Cooling Water Meter-01",
    sn: "SN: WF-220184-Y",
    brandModel: "Siemens MAG 5100",
    brand: "Siemens",
    type: "Flow Meter",
    kind: "flow",
    status: "active",
    lastSync: "10:44:02 24/05/2024",
    protocol: "Modbus TCP",
  },
];

const extra: CatalogDevice[] = Array.from({ length: 122 }, (_, i) => {
  const n = i + 7;
  const cycle: Array<
    Pick<CatalogDevice, "brand" | "brandModel" | "type" | "kind" | "status" | "protocol">
  > = [
    {
      brand: "Schneider",
      brandModel: "Schneider iEM3000",
      type: "Power Meter",
      kind: "power",
      status: i % 31 === 0 ? "offline" : i % 17 === 0 ? "maintenance" : "active",
      protocol: "Modbus RTU",
    },
    {
      brand: "Siemens",
      brandModel: "Siemens SITRANS F",
      type: "Flow Meter",
      kind: "flow",
      status: i % 19 === 0 ? "maintenance" : "active",
      protocol: "Modbus TCP",
    },
    {
      brand: "ABB",
      brandModel: "ABB SensyTemp",
      type: "Temperature",
      kind: "temp",
      status: i % 23 === 0 ? "offline" : "active",
      protocol: "M-Bus",
    },
    {
      brand: "Yokogawa",
      brandModel: "Yokogawa EJX",
      type: "Steam Meter",
      kind: "steam",
      status: "active",
      protocol: "BACnet",
    },
  ];
  const item = cycle[i % cycle.length];
  const hour = String(8 + (i % 10)).padStart(2, "0");
  const min = String((i * 3) % 60).padStart(2, "0");
  const sec = String((i * 7) % 60).padStart(2, "0");
  return {
    id: `dev-${n}`,
    name: `${item.type.split(" ")[0]} Unit-${String(n).padStart(2, "0")}`,
    sn: `SN: XX-${String(100000 + n)}-${String.fromCharCode(65 + (i % 26))}`,
    ...item,
    lastSync: i % 11 === 0 ? "Vừa xong" : `${hour}:${min}:${sec} 24/05/2024`,
  };
});

export const INITIAL_DEVICES: CatalogDevice[] = [...seeds, ...extra];

export function deviceSpec(device: CatalogDevice) {
  const protocol = device.protocol?.trim();
  return protocol ? `${protocol} • ${device.type}` : device.type;
}

export function loadDevices(): CatalogDevice[] {
  if (typeof window === "undefined") return INITIAL_DEVICES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_DEVICES;
    const parsed = JSON.parse(raw) as CatalogDevice[];
    return Array.isArray(parsed) && parsed.length ? parsed : INITIAL_DEVICES;
  } catch {
    return INITIAL_DEVICES;
  }
}

export function saveDevices(devices: CatalogDevice[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
}

export function upsertDevice(device: CatalogDevice) {
  const devices = loadDevices();
  const exists = devices.some((item) => item.id === device.id);
  const next = exists
    ? devices.map((item) => (item.id === device.id ? device : item))
    : [device, ...devices];
  saveDevices(next);
  return next;
}

export function removeDevice(id: string) {
  const next = loadDevices().filter((item) => item.id !== id);
  saveDevices(next);
  return next;
}

export function todaySyncLabel() {
  return new Date().toLocaleString("vi-VN");
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
  const value = deviceType.toLowerCase();
  if (value.includes("nước") || value.includes("water")) return "Flow Meter";
  if (value.includes("nhiệt") || value.includes("temp")) return "Temperature";
  if (value.includes("hơi") || value.includes("steam")) return "Steam Meter";
  if (value.includes("inverter")) return "Inverter";
  return "Power Meter";
}
