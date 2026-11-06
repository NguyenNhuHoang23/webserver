import { dbFetch, emitDbChange } from "@/lib/db-client";

export type ScopeId = 1 | 2 | 3;
export type GhgInputMethod = "meter" | "manual" | "file";

/** Hệ số nhân gắn với một nguồn, ví dụ hệ số quy đổi CO₂ (kCO2). */
export type GhgMultiplier = {
  id: string;
  label: string;
  symbol: string;
  value: number;
  unit: string;
};

export type GhgEmissionSource = {
  id: string;
  projectId?: string;
  scope: ScopeId;
  name: string;
  method: GhgInputMethod;
  factorId: string;
  factorValue: number;
  formula: string;
  appliedAt: string;
  /** Điểm đo được chọn làm dữ liệu hoạt động cho nguồn phát thải */
  meterPointId?: string;
  /** Giá trị hoạt động nhập thủ công (khối lượng nhiên liệu, …) */
  manualValue?: number;
  /** Đơn vị của giá trị thủ công (tùy chọn) */
  manualUnit?: string;
  /** Hệ số nhân riêng của nguồn, ký hiệu được chèn vào công thức */
  multipliers?: GhgMultiplier[];
  /** tấn CO₂e đã lưu — dùng trang tổng quan */
  tons?: number;
};

/**
 * Ước tính tấn CO₂e:
 * - Có hệ số phát thải: thủ công × hệ số × tích hệ số nhân
 * - Chỉ hệ số nhân: thủ công × tích hệ số nhân
 */
export function computeManualTons(
  source: Pick<GhgEmissionSource, "method" | "manualValue" | "factorValue" | "factorId" | "multipliers" | "tons">,
) {
  if (source.method !== "manual") return source.tons;
  const activity = source.manualValue;
  if (activity == null || !Number.isFinite(activity)) return source.tons;
  const hasFactor =
    Boolean(source.factorId && !source.factorId.startsWith("none:")) &&
    Number.isFinite(source.factorValue) &&
    (source.factorValue ?? 0) !== 0;
  const factor = hasFactor ? (source.factorValue as number) : 1;
  const mul = (source.multipliers ?? []).reduce(
    (product, row) => product * (Number.isFinite(row.value) ? row.value : 1),
    1,
  );
  const tons = activity * factor * mul;
  if (!Number.isFinite(tons)) return source.tons;
  return Number(tons.toFixed(6));
}

export const GHG_SCOPES: { id: ScopeId; label: string; color: string }[] = [
  { id: 1, label: "Phạm vi 1", color: "#22c55e" },
  { id: 2, label: "Phạm vi 2", color: "#3b82f6" },
  { id: 3, label: "Phạm vi 3", color: "#f59e0b" },
];

export function scopeLabel(scope: ScopeId) {
  return GHG_SCOPES.find((item) => item.id === scope)?.label ?? `Phạm vi ${scope}`;
}

export function scopeColor(scope: ScopeId) {
  return GHG_SCOPES.find((item) => item.id === scope)?.color ?? "#64748b";
}

let ghgSourcesCache: GhgEmissionSource[] = [];
const ghgSourcesByProject: Record<string, GhgEmissionSource[]> = {};
const ghgHydration = new Map<string, Promise<GhgEmissionSource[]>>();

export function loadGhgSources(projectId?: string): GhgEmissionSource[] {
  if (projectId && ghgSourcesByProject[projectId]) return ghgSourcesByProject[projectId]!;
  return ghgSourcesCache;
}

export function saveGhgSources(sources: GhgEmissionSource[], projectId?: string) {
  ghgSourcesCache = sources;
  emitDbChange("ghg-sources");
  const resolvedProjectId = projectId ?? sources[0]?.projectId;
  if (!resolvedProjectId) return;
  ghgSourcesByProject[resolvedProjectId] = sources;
  void dbFetch("ghg-sources", {
    method: "POST",
    body: JSON.stringify({ projectId: resolvedProjectId, sources }),
  }).catch((error) => console.error("Không thể lưu nguồn GHG", error));
}

export function hydrateGhgSources(projectId?: string) {
  if (typeof window === "undefined") return Promise.resolve(loadGhgSources());
  const key = projectId ?? "all";
  const active = ghgHydration.get(key);
  if (active) return active;
  const request = dbFetch<GhgEmissionSource[]>("ghg-sources", {
    query: { projectId },
  })
    .then((sources) => {
      ghgSourcesCache = sources;
      if (projectId) ghgSourcesByProject[projectId] = sources;
      emitDbChange("ghg-sources");
      return sources;
    })
    .finally(() => {
      ghgHydration.delete(key);
    });
  ghgHydration.set(key, request);
  return request;
}
