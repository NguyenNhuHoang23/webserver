export type MeterTypeIconId = "bolt" | "drop" | "thermo" | "steam" | "air" | "generic";

export type MeterTypeDef = {
  name: string;
  description: string;
  icon: MeterTypeIconId;
  builtin: boolean;
};

const STORAGE_KEY = "ems-meter-types";

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
  if (typeof window === "undefined") return DEFAULT_METER_TYPE_DEFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_METER_TYPE_DEFS;
    const parsed = JSON.parse(raw) as MeterTypeDef[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_METER_TYPE_DEFS;
    const custom = parsed.filter((item) => item?.name && !item.builtin);
    const builtins = DEFAULT_METER_TYPE_DEFS.map((item) => {
      const stored = parsed.find((row) => row.name === item.name && row.builtin);
      return stored ? { ...item, description: stored.description || item.description } : item;
    });
    const seen = new Set(builtins.map((item) => item.name.toLowerCase()));
    const extras = custom.filter((item) => {
      const key = item.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return [
      ...builtins,
      ...extras.map((item) => ({
        name: item.name.trim(),
        description: item.description?.trim() || "Loại điểm đo tùy chỉnh",
        icon: item.icon || inferMeterTypeIcon(item.name),
        builtin: false,
      })),
    ];
  } catch {
    return DEFAULT_METER_TYPE_DEFS;
  }
}

export function saveMeterTypeDefs(defs: MeterTypeDef[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defs));
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
