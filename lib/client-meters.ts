import { dbFetch, emitDbChange } from "@/lib/db-client";

/** Điểm đo khách hàng — cây cha-con + gán thiết bị (Cấu hình → Cụm điểm đo). */

export type MeterUtility = string;

export type ClientMeter = {
  id: string;
  name: string;
  /** Mã ID điểm đo hiển thị */
  code: string;
  /** Loại / mô tả thiết bị (có thể lấy từ catalog) */
  type: string;
  parentId: string | null;
  utility: MeterUtility;
  /** ID thiết bị trong thư viện (`lib/devices`) — bắt buộc để điểm đo có dữ liệu */
  deviceId: string | null;
  /** Serial nhập tay khi chưa gán được thiết bị trong thư viện */
  serialNumber?: string | null;
};

const meterCache: Store = {};
const meterHydration = new Map<string, Promise<ClientMeter[]>>();

const DEFAULT_METERS: ClientMeter[] = [
  {
    id: "m1",
    name: "Main Panel Tổng tầng 1",
    code: "MP-001",
    type: "Đồng hồ tổng 3 pha",
    parentId: null,
    utility: "Điện",
    deviceId: "dev-1",
    serialNumber: "SN: EM-992834-A",
  },
  {
    id: "m2",
    name: "Phòng Server",
    code: "PS-001",
    type: "Smart Meter V3",
    parentId: "m1",
    utility: "Điện",
    deviceId: "dev-5",
    serialNumber: "SN: EM-883401-B",
  },
  {
    id: "m3",
    name: "Chiller Unit 1",
    code: "CHU-01",
    type: "Sub-meter Modbus",
    parentId: "m1",
    utility: "Điện",
    deviceId: null,
  },
  {
    id: "m4",
    name: "HVAC System",
    code: "HVAC-01",
    type: "Power Analyzer",
    parentId: "m1",
    utility: "Điện",
    deviceId: null,
  },
  {
    id: "m5",
    name: "Đồng hồ nước đầu nguồn",
    code: "WTR-01",
    type: "Đồng hồ lưu lượng",
    parentId: null,
    utility: "Nước",
    deviceId: "dev-2",
    serialNumber: "SN: WF-112093-X",
  },
  {
    id: "m6",
    name: "Lò hơi trung tâm",
    code: "STM-01",
    type: "Cảm biến hơi",
    parentId: null,
    utility: "Hơi",
    deviceId: "dev-4",
    serialNumber: "SN: SG-778120-K",
  },
  {
    id: "m7",
    name: "Cảm biến nhiệt dàn",
    code: "HT-01",
    type: "Nhiệt kế IoT",
    parentId: null,
    utility: "Nhiệt",
    deviceId: "dev-3",
    serialNumber: "SN: TP-445021-Z",
  },
];

type Store = Record<string, ClientMeter[]>;

export function defaultClientMeters(): ClientMeter[] {
  return DEFAULT_METERS.map((meter) => ({ ...meter }));
}

export function loadClientMeters(projectId: string): ClientMeter[] {
  if (!Object.prototype.hasOwnProperty.call(meterCache, projectId)) {
    return defaultClientMeters();
  }
  const rows = meterCache[projectId];
  return (rows ?? []).map((meter) => ({
    ...meter,
    deviceId: meter.deviceId ?? null,
    parentId: meter.parentId ?? null,
    serialNumber: meter.serialNumber ?? null,
  }));
}

export async function saveClientMeters(projectId: string, meters: ClientMeter[]) {
  meterCache[projectId] = meters;
  emitDbChange("client-meters");
  await dbFetch("client-meters", {
    method: "POST",
    body: JSON.stringify({ projectId, meters }),
  });
}

export function hydrateClientMeters(projectId: string) {
  if (typeof window === "undefined") return Promise.resolve(loadClientMeters(projectId));
  const active = meterHydration.get(projectId);
  if (active) return active;
  const request = dbFetch<ClientMeter[]>("client-meters", { query: { projectId } })
    .then((meters) => {
      // An empty response is a valid project with no configured points.
      // Do not inject demo meters into a real project after a successful DB read.
      meterCache[projectId] = meters;
      emitDbChange("client-meters");
      return meterCache[projectId];
    })
    .finally(() => {
      meterHydration.delete(projectId);
    });
  meterHydration.set(projectId, request);
  return request;
}

export function orderMetersByTree(meters: ClientMeter[]): ClientMeter[] {
  const byParent = new Map<string | null, ClientMeter[]>();
  for (const meter of meters) {
    const key = meter.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(meter);
  }
  for (const group of byParent.values()) {
    group.sort((a, b) => meters.indexOf(a) - meters.indexOf(b));
  }

  const ordered: ClientMeter[] = [];
  function walk(parentId: string | null) {
    for (const meter of byParent.get(parentId) ?? []) {
      ordered.push(meter);
      walk(meter.id);
    }
  }
  walk(null);
  return ordered;
}

export function buildMeterDepthMap(meters: ClientMeter[]) {
  const map = new Map(meters.map((meter) => [meter.id, meter]));
  const depths = new Map<string, number>();

  function depthFor(id: string): number {
    if (depths.has(id)) return depths.get(id)!;
    const meter = map.get(id);
    if (!meter?.parentId || !map.has(meter.parentId)) {
      depths.set(id, 0);
      return 0;
    }
    const next = depthFor(meter.parentId) + 1;
    depths.set(id, next);
    return next;
  }

  for (const meter of meters) depthFor(meter.id);
  return depths;
}

export function isMeterDescendant(
  meters: ClientMeter[],
  ancestorId: string,
  nodeId: string,
) {
  const map = new Map(meters.map((meter) => [meter.id, meter]));
  let current = map.get(nodeId);
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = map.get(current.parentId);
  }
  return false;
}
