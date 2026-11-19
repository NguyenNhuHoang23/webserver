import { dbFetch, emitDbChange } from "@/lib/db-client";
import { registerToKwh } from "@/lib/meter-parameters";

export type MeterReplacement = {
  id: string;
  projectId: string;
  meterPointId: string;
  replacedAt: string;
  oldSerial: string;
  newSerial: string;
  oldCategory?: string | null;
  newCategory?: string | null;
  /** Chỉ số EPaed thô cuối cùng của đồng hồ cũ (cùng đơn vị gateway lưu). */
  lastReadingWh: number;
  note?: string;
};

let cacheByProject = new Map<string, MeterReplacement[]>();
const hydration = new Map<string, Promise<MeterReplacement[]>>();

export function effectiveRegisterKwh(rawWh: number, offsetKwh = 0) {
  return registerToKwh(rawWh) + (Number.isFinite(offsetKwh) ? offsetKwh : 0);
}

/** Offset cần cộng vào chỉ số tại thời điểm `atIso` (sau các lần thay đã xảy ra). */
export function offsetKwhAt(
  replacements: MeterReplacement[],
  meterPointId: string,
  atIso: string,
) {
  const atMs = Date.parse(atIso.endsWith("Z") ? atIso : `${atIso}Z`);
  if (!Number.isFinite(atMs)) return 0;
  let offset = 0;
  for (const item of replacements) {
    if (item.meterPointId !== meterPointId) continue;
    const replacedMs = Date.parse(
      item.replacedAt.endsWith("Z") ? item.replacedAt : `${item.replacedAt}Z`,
    );
    if (!Number.isFinite(replacedMs) || replacedMs > atMs) continue;
    offset += registerToKwh(item.lastReadingWh);
  }
  return offset;
}

export function loadMeterReplacements(projectId: string) {
  return cacheByProject.get(projectId) ?? [];
}

export function hydrateMeterReplacements(projectId: string) {
  if (typeof window === "undefined") return Promise.resolve(loadMeterReplacements(projectId));
  const active = hydration.get(projectId);
  if (active) return active;
  const request = dbFetch<MeterReplacement[]>("meter-replacements", { query: { projectId } })
    .then((rows) => {
      const list = Array.isArray(rows) ? rows : [];
      cacheByProject.set(projectId, list);
      emitDbChange("meter-replacements");
      return list;
    })
    .finally(() => {
      hydration.delete(projectId);
    });
  hydration.set(projectId, request);
  return request;
}

export async function recordMeterReplacement(input: {
  projectId: string;
  meterPointId: string;
  oldSerial: string;
  newSerial: string;
  oldCategory?: string | null;
  newCategory?: string | null;
  lastReadingWh: number;
  replacedAt?: string;
  note?: string;
}) {
  const rows = await dbFetch<MeterReplacement[]>("meter-replacements", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const list = Array.isArray(rows) ? rows : [];
  cacheByProject.set(input.projectId, list);
  emitDbChange("meter-replacements");
  return list;
}
