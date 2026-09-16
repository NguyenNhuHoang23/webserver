import { dbFetch, emitDbChange } from "@/lib/db-client";

export type ScopeId = 1 | 2 | 3;
export type GhgInputMethod = "meter" | "manual" | "file";

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
  /** tấn CO₂e demo — dùng trang tổng quan */
  tons?: number;
};

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

export const INITIAL_GHG_SOURCES: GhgEmissionSource[] = [
  {
    id: "src-1",
    scope: 1,
    name: "Khí Gas (LPG)",
    method: "manual",
    factorId: "do-industry:co2",
    factorValue: 74100,
    formula: "{Giá trị thủ công} * {Hệ số phát thải}",
    appliedAt: "2024-01-01",
    tons: 850.2,
  },
  {
    id: "src-2",
    scope: 1,
    name: "Nhiên liệu phương tiện",
    method: "manual",
    factorId: "do-road:co2",
    factorValue: 74100,
    formula: "{Giá trị thủ công} * {Hệ số phát thải}",
    appliedAt: "2024-01-01",
    tons: 170.0,
  },
  {
    id: "src-3",
    scope: 1,
    name: "Phát thải rò rỉ (Gas lạnh)",
    method: "manual",
    factorId: "do-industry:co2",
    factorValue: 74100,
    formula: "{Giá trị thủ công} * {Hệ số phát thải}",
    appliedAt: "2024-01-01",
    tons: 42.5,
  },
  {
    id: "src-4",
    scope: 2,
    name: "Sử dụng điện năng",
    method: "meter",
    factorId: "natural-gas:co2",
    factorValue: 56100,
    formula: "{Giá trị điểm đo} * {Hệ số phát thải}",
    appliedAt: "2024-03-01",
    tons: 3188.1,
  },
  {
    id: "src-5",
    scope: 2,
    name: "Phát thải mua hơi nước",
    method: "meter",
    factorId: "natural-gas:co2",
    factorValue: 56100,
    formula: "{Giá trị điểm đo} * {Hệ số phát thải}",
    appliedAt: "2024-03-01",
    tons: 212.0,
  },
  {
    id: "src-6",
    scope: 3,
    name: "Vận tải hàng hóa đầu vào",
    method: "file",
    factorId: "gasoline-road:co2",
    factorValue: 69300,
    formula: "{Giá trị điểm đo} * {Hệ số phát thải}",
    appliedAt: "2024-02-15",
    tons: 95.4,
  },
];

export function loadGhgSources(projectId?: string): GhgEmissionSource[] {
  if (projectId && ghgSourcesByProject[projectId]) return ghgSourcesByProject[projectId]!;
  return ghgSourcesCache.length ? ghgSourcesCache : INITIAL_GHG_SOURCES;
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

/** Gán tấn CO₂e demo nếu nguồn cấu hình chưa có */
export function withDemoTons(sources: GhgEmissionSource[]): GhgEmissionSource[] {
  return sources.map((source, index) => {
    if (typeof source.tons === "number") return source;
    const fallback = [850.2, 170, 42.5, 3188.1, 212, 95.4];
    return { ...source, tons: fallback[index % fallback.length] };
  });
}
