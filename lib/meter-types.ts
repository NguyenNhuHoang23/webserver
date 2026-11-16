import { dbFetch, emitDbChange } from "@/lib/db-client";

export type MeterTypeIconId = "bolt" | "drop" | "thermo" | "steam" | "air" | "generic";

export type MeterTypeDef = {
  name: string;
  description: string;
  icon: MeterTypeIconId;
  builtin: boolean;
};

let meterTypeCache: MeterTypeDef[] = [];
let meterTypesHydration: Promise<MeterTypeDef[]> | null = null;

export const DEFAULT_METER_TYPE_DEFS: MeterTypeDef[] = [
  {
    name: "Điện",
    description: "Điện năng, công suất, chất lượng điện",
    icon: "bolt",
    builtin: true,
  },
  {
    name: "Nước",
    description: "Lưu lượng và sản lượng nước",
    icon: "drop",
    builtin: true,
  },
  {
    name: "Nhiệt",
    description: "Nhiệt độ và năng lượng nhiệt",
    icon: "thermo",
    builtin: true,
  },
  {
    name: "Hơi",
    description: "Áp suất và lưu lượng hơi",
    icon: "steam",
    builtin: true,
  },
];

export function inferMeterTypeIcon(name: string): MeterTypeIconId {
  const value = name.trim().toLowerCase();
  if (value.includes("điện") || value.includes("dien")) return "bolt";
  if (value.includes("nước") || value.includes("nuoc")) return "drop";
  if (value.includes("nhiệt") || value.includes("nhiet")) return "thermo";
  if (value.includes("hơi") || value.includes("hoi")) return "steam";
  if (value.includes("khí") || value.includes("khi") || value.includes("air")) return "air";
  return "generic";
}

function normalizeDefs(defs: MeterTypeDef[]) {
  return defs.map((item) => ({
    ...item,
    builtin: Boolean(item.builtin),
  }));
}

export function loadMeterTypeDefs(): MeterTypeDef[] {
  return meterTypeCache.length ? meterTypeCache : DEFAULT_METER_TYPE_DEFS;
}

export function hydrateMeterTypeDefs() {
  if (typeof window === "undefined") return Promise.resolve(loadMeterTypeDefs());
  if (meterTypesHydration) return meterTypesHydration;
  meterTypesHydration = dbFetch<MeterTypeDef[]>("meter-types")
    .then((defs) => {
      meterTypeCache = defs.length ? normalizeDefs(defs) : DEFAULT_METER_TYPE_DEFS;
      emitDbChange("meter-types");
      return meterTypeCache;
    })
    .finally(() => {
      meterTypesHydration = null;
    });
  return meterTypesHydration;
}

export async function upsertMeterTypeDef(
  input: { name: string; description: string },
  previousName?: string,
) {
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name) throw new Error("Vui lòng nhập tên loại điểm đo.");
  const defs = loadMeterTypeDefs();
  const previous = previousName?.trim();
  const duplicate = defs.find(
    (item) => item.name.toLowerCase() === name.toLowerCase() && item.name !== previous,
  );
  if (duplicate) throw new Error("Loại điểm đo này đã tồn tại.");

  let payload: MeterTypeDef & { previousName?: string };
  if (previous) {
    const current = defs.find((item) => item.name === previous);
    if (!current) throw new Error("Không tìm thấy loại điểm đo.");
    if (current.builtin && name !== current.name) {
      throw new Error("Không thể đổi tên loại điểm đo mặc định.");
    }
    payload = {
      name: current.builtin ? current.name : name,
      description: description || current.description,
      icon: current.builtin ? current.icon : inferMeterTypeIcon(name),
      builtin: current.builtin,
      previousName: previous !== name ? previous : undefined,
    };
  } else {
    payload = {
      name,
      description: description || "Loại điểm đo tùy chỉnh",
      icon: inferMeterTypeIcon(name),
      builtin: false,
    };
  }

  const saved = await dbFetch<MeterTypeDef[]>("meter-types", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  meterTypeCache = normalizeDefs(saved);
  emitDbChange("meter-types");
  return meterTypeCache;
}

export async function removeMeterTypeDef(name: string) {
  const defs = loadMeterTypeDefs();
  const current = defs.find((item) => item.name === name);
  if (!current) return defs;
  if (current.builtin) throw new Error("Không thể xóa loại điểm đo mặc định.");
  await dbFetch("meter-types", { method: "DELETE", query: { id: name } });
  meterTypeCache = defs.filter((item) => item.name !== name);
  emitDbChange("meter-types");
  return meterTypeCache;
}
