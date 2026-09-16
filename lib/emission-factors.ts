import { dbFetch, emitDbChange } from "@/lib/db-client";

export type GasKey = "co2" | "ch4" | "n2o";

export type GasValue = {
  key: GasKey | string;
  label: string;
  value: number;
  unit: string;
};

export type FactorGroup = {
  id: string;
  name: string;
  source: string;
  gases: GasValue[];
};

export const SOURCE_2626 =
  "Quyết định số 2626/QĐ-BTNMT ngày 10/10/2022, Phụ lục I";

let factorGroupsCache: FactorGroup[] = [];
let factorsHydration: Promise<FactorGroup[]> | null = null;

export const INITIAL_FACTOR_GROUPS: FactorGroup[] = [
  {
    id: "do-industry",
    name: "Hệ số phát thải của DO trong công nghiệp sản xuất và xây dựng*",
    source: SOURCE_2626,
    gases: [
      { key: "co2", label: "CO₂", value: 74100, unit: "kg CO₂/TJ" },
      { key: "ch4", label: "CH₄", value: 3, unit: "kg CH₄/TJ" },
      { key: "n2o", label: "N₂O", value: 0.6, unit: "kg N₂O/TJ" },
    ],
  },
  {
    id: "do-road",
    name: "Hệ số phát thải của dầu DO trong phương tiện vận chuyển đường bộ*",
    source: SOURCE_2626,
    gases: [
      { key: "co2", label: "CO₂", value: 74100, unit: "kg CO₂/TJ" },
      { key: "ch4", label: "CH₄", value: 3.9, unit: "kg CH₄/TJ" },
      { key: "n2o", label: "N₂O", value: 3.9, unit: "kg N₂O/TJ" },
    ],
  },
  {
    id: "gasoline-road",
    name: "Hệ số phát thải của xăng trong phương tiện vận chuyển đường bộ*",
    source: SOURCE_2626,
    gases: [
      { key: "co2", label: "CO₂", value: 69300, unit: "kg CO₂/TJ" },
      { key: "ch4", label: "CH₄", value: 33, unit: "kg CH₄/TJ" },
      { key: "n2o", label: "N₂O", value: 3.2, unit: "kg N₂O/TJ" },
    ],
  },
  {
    id: "lpg-industry",
    name: "Hệ số phát thải của LPG trong công nghiệp*",
    source: SOURCE_2626,
    gases: [
      { key: "co2", label: "CO₂", value: 63100, unit: "kg CO₂/TJ" },
      { key: "ch4", label: "CH₄", value: 1, unit: "kg CH₄/TJ" },
      { key: "n2o", label: "N₂O", value: 0.1, unit: "kg N₂O/TJ" },
    ],
  },
  {
    id: "natural-gas",
    name: "Hệ số phát thải của khí tự nhiên*",
    source: SOURCE_2626,
    gases: [
      { key: "co2", label: "CO₂", value: 56100, unit: "kg CO₂/TJ" },
      { key: "ch4", label: "CH₄", value: 1, unit: "kg CH₄/TJ" },
      { key: "n2o", label: "N₂O", value: 0.1, unit: "kg N₂O/TJ" },
    ],
  },
  {
    id: "anthracite",
    name: "Hệ số phát thải của than antraxit*",
    source: SOURCE_2626,
    gases: [
      { key: "co2", label: "CO₂", value: 98300, unit: "kg CO₂/TJ" },
      { key: "ch4", label: "CH₄", value: 1, unit: "kg CH₄/TJ" },
      { key: "n2o", label: "N₂O", value: 1.5, unit: "kg N₂O/TJ" },
    ],
  },
];

export function parseFactorNumber(value: string) {
  const trimmed = value.trim().replace(/\s/g, "");
  if (!trimmed) return 0;
  if (/^\d{1,3}(\.\d{3})+$/.test(trimmed)) {
    return Number(trimmed.replace(/\./g, ""));
  }
  const next = Number(trimmed.replace(",", "."));
  return Number.isFinite(next) ? next : 0;
}

export function formatFactorValue(value: number) {
  if (Number.isInteger(value) && Math.abs(value) >= 1000) {
    return value.toLocaleString("vi-VN");
  }
  return String(value);
}

export function loadFactorGroups(): FactorGroup[] {
  return factorGroupsCache.length ? factorGroupsCache : INITIAL_FACTOR_GROUPS;
}

export function saveFactorGroups(groups: FactorGroup[]) {
  factorGroupsCache = groups;
  emitDbChange("emission-factors");
  for (const group of groups) {
    void dbFetch("emission-factors", {
      method: "POST",
      body: JSON.stringify(group),
    }).catch((error) => console.error("Không thể lưu hệ số phát thải", error));
  }
}

export function hydrateFactorGroups() {
  if (typeof window === "undefined") return Promise.resolve(loadFactorGroups());
  if (factorsHydration) return factorsHydration;
  factorsHydration = dbFetch<FactorGroup[]>("emission-factors")
    .then((groups) => {
      factorGroupsCache = groups.length ? groups : INITIAL_FACTOR_GROUPS;
      emitDbChange("emission-factors");
      return factorGroupsCache;
    })
    .finally(() => {
      factorsHydration = null;
    });
  return factorsHydration;
}

export function upsertFactorGroup(group: FactorGroup) {
  const groups = loadFactorGroups();
  const exists = groups.some((item) => item.id === group.id);
  const next = exists
    ? groups.map((item) => (item.id === group.id ? group : item))
    : [group, ...groups];
  saveFactorGroups(next);
  return next;
}

export function removeFactorGroup(id: string) {
  const next = loadFactorGroups().filter((item) => item.id !== id);
  saveFactorGroups(next);
  return next;
}

export type LibraryFactor = {
  id: string;
  groupId: string;
  name: string;
  source: string;
  gasKey: GasKey | string;
  gasLabel: string;
  value: number;
  unit: string;
};

export function flattenFactorGroups(groups: FactorGroup[]): LibraryFactor[] {
  return groups.flatMap((group) =>
    group.gases.map((gas) => ({
      id: `${group.id}:${gas.key}`,
      groupId: group.id,
      name: group.name,
      source: group.source,
      gasKey: gas.key,
      gasLabel: gas.label,
      value: gas.value,
      unit: gas.unit,
    })),
  );
}
