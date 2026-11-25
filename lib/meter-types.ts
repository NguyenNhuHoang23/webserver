import { dbFetch, emitDbChange } from "@/lib/db-client";

export type MeterTypeIconId = "bolt" | "drop" | "thermo" | "steam" | "air" | "generic";

export type MeterTypeDef = {
  name: string;
  description: string;
  /** Mã điểm đo (ký hiệu ngắn, vd. E, W). Rỗng nếu chưa đặt. */
  code: string;
  icon: MeterTypeIconId;
  builtin: boolean;
};

/** Mã điểm đo: chữ/số không dấu, `_` hoặc `-`, tối đa 10 ký tự. */
export const METER_TYPE_CODE_PATTERN = /^[A-Z0-9_-]{0,10}$/;

export function normalizeMeterTypeCode(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

let meterTypeCache: MeterTypeDef[] = [];
let meterTypesHydration: Promise<MeterTypeDef[]> | null = null;

export const DEFAULT_METER_TYPE_DEFS: MeterTypeDef[] = [
  {
    name: "Điện",
    description: "Điện năng, công suất, chất lượng điện",
    code: "",
    icon: "bolt",
    builtin: true,
  },
  {
    name: "Nước",
    description: "Lưu lượng và sản lượng nước",
    code: "",
    icon: "drop",
    builtin: true,
  },
  {
    name: "Nhiệt",
    description: "Nhiệt độ và năng lượng nhiệt",
    code: "",
    icon: "thermo",
    builtin: true,
  },
  {
    name: "Hơi",
    description: "Áp suất và lưu lượng hơi",
    code: "",
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
    code: normalizeMeterTypeCode(item.code),
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
  input: { name: string; description: string; code?: string },
  previousName?: string,
) {
  const name = input.name.trim();
  const description = input.description.trim();
  const code = normalizeMeterTypeCode(input.code);
  if (!name) throw new Error("Vui lòng nhập tên loại điểm đo.");
  if (!METER_TYPE_CODE_PATTERN.test(code)) {
    throw new Error("Mã điểm đo chỉ gồm chữ không dấu, số, _ hoặc -, tối đa 10 ký tự.");
  }
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
      code,
      icon: current.builtin ? current.icon : inferMeterTypeIcon(name),
      builtin: current.builtin,
      previousName: previous !== name ? previous : undefined,
    };
  } else {
    payload = {
      name,
      description: description || "Loại điểm đo tùy chỉnh",
      code,
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
