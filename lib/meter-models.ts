import { dbFetch, emitDbChange } from "@/lib/db-client";
import { METER_MODEL_BY_CODE } from "@/lib/gateway-protocol";

export type MeterModelDef = {
  name: string;
  description: string;
  code?: number | null;
  builtin: boolean;
  serials: string[];
};

let meterModelCache: MeterModelDef[] = [];
let meterModelsHydration: Promise<MeterModelDef[]> | null = null;

export const DEFAULT_METER_MODELS: MeterModelDef[] = Object.entries(METER_MODEL_BY_CODE).map(
  ([code, name]) => ({
    name,
    description: `Model gateway meterModel = ${name}`,
    code: Number(code),
    builtin: true,
    serials: [],
  }),
);

function normalizeModels(rows: MeterModelDef[]) {
  return rows.map((item) => ({
    name: String(item.name ?? "").trim(),
    description: String(item.description ?? "").trim(),
    code: item.code == null || item.code === ("" as unknown) ? null : Number(item.code),
    builtin: Boolean(item.builtin),
    serials: Array.from(
      new Set(
        (Array.isArray(item.serials) ? item.serials : [])
          .map((serial) => String(serial ?? "").trim())
          .filter(Boolean),
      ),
    ).sort(),
  })).filter((item) => item.name);
}

export function loadMeterModels(): MeterModelDef[] {
  return meterModelCache.length ? meterModelCache : DEFAULT_METER_MODELS;
}

export function hydrateMeterModels() {
  if (typeof window === "undefined") return Promise.resolve(loadMeterModels());
  if (meterModelsHydration) return meterModelsHydration;
  meterModelsHydration = dbFetch<MeterModelDef[]>("meter-models")
    .then((rows) => {
      const next = normalizeModels(Array.isArray(rows) ? rows : []);
      meterModelCache = next.length ? next : DEFAULT_METER_MODELS;
      emitDbChange("meter-models");
      return meterModelCache;
    })
    .finally(() => {
      meterModelsHydration = null;
    });
  return meterModelsHydration;
}

export async function upsertMeterModel(
  input: {
    name: string;
    description?: string;
    code?: number | null;
    serials?: string[];
  },
  previousName?: string,
) {
  const name = input.name.trim();
  if (!name) throw new Error("Vui lòng nhập tên Category (meterModel).");
  const payload = {
    name,
    description: (input.description ?? "").trim() || `Model gateway meterModel = ${name}`,
    code: input.code ?? null,
    serials: input.serials ?? [],
    previousName: previousName?.trim() || undefined,
  };
  const rows = await dbFetch<MeterModelDef[]>("meter-models", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  meterModelCache = normalizeModels(Array.isArray(rows) ? rows : []);
  emitDbChange("meter-models");
  return meterModelCache;
}

export async function removeMeterModel(name: string) {
  await dbFetch("meter-models", { method: "DELETE", query: { id: name } });
  meterModelCache = loadMeterModels().filter((item) => item.name !== name);
  emitDbChange("meter-models");
  return meterModelCache;
}

export function serialsForModel(models: MeterModelDef[], modelName: string) {
  const found = models.find((item) => item.name === modelName);
  return found?.serials ?? [];
}
