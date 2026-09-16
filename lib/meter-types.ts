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

export function loadMeterTypeDefs(): MeterTypeDef[] {
  return meterTypeCache.length ? meterTypeCache : DEFAULT_METER_TYPE_DEFS;
}

export function saveMeterTypeDefs(defs: MeterTypeDef[]) {
  meterTypeCache = defs;
  emitDbChange("meter-types");
  for (const def of defs) {
    void dbFetch("meter-types", {
      method: "POST",
      body: JSON.stringify(def),
    }).catch((error) => console.error("Không thể lưu loại điểm đo", error));
  }
}

export function hydrateMeterTypeDefs() {
  if (typeof window === "undefined") return Promise.resolve(loadMeterTypeDefs());
  if (meterTypesHydration) return meterTypesHydration;
  meterTypesHydration = dbFetch<MeterTypeDef[]>("meter-types")
    .then((defs) => {
      meterTypeCache = defs.length ? defs : DEFAULT_METER_TYPE_DEFS;
      emitDbChange("meter-types");
      return meterTypeCache;
    })
    .finally(() => {
      meterTypesHydration = null;
    });
  return meterTypesHydration;
}

export function upsertMeterTypeDef(input: { name: string; description: string }, previousName?: string) {
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name) throw new Error("Vui lòng nhập tên loại điểm đo.");
  const defs = loadMeterTypeDefs();
  const previous = previousName?.trim();
  const duplicate = defs.find(
    (item) => item.name.toLowerCase() === name.toLowerCase() && item.name !== previous,
  );
  if (duplicate) throw new Error("Loại điểm đo này đã tồn tại.");

  if (previous) {
    const current = defs.find((item) => item.name === previous);
    if (!current) throw new Error("Không tìm thấy loại điểm đo.");
    if (current.builtin && name !== current.name) {
      throw new Error("Không thể đổi tên loại điểm đo mặc định.");
    }
    const next = defs.map((item) =>
      item.name === previous
        ? {
            ...item,
            name: current.builtin ? item.name : name,
            description: description || item.description,
            icon: current.builtin ? item.icon : inferMeterTypeIcon(name),
          }
        : item,
    );
    saveMeterTypeDefs(next);
    return next;
  }

  const next = [
    ...defs,
    {
      name,
      description: description || "Loại điểm đo tùy chỉnh",
      icon: inferMeterTypeIcon(name),
      builtin: false,
    },
  ];
  saveMeterTypeDefs(next);
  return next;
}

export function removeMeterTypeDef(name: string) {
  const defs = loadMeterTypeDefs();
  const current = defs.find((item) => item.name === name);
  if (!current) return defs;
  if (current.builtin) throw new Error("Không thể xóa loại điểm đo mặc định.");
  const next = defs.filter((item) => item.name !== name);
  saveMeterTypeDefs(next);
  return next;
}
