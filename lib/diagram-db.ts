import { dbFetch, emitDbChange } from "@/lib/db-client";

export type SavedDiagramState = {
  projectId: string;
  utility: string;
  positions: Record<string, { x: number; y: number }>;
  viewport?: { x: number; y: number; zoom: number };
};

const stateCache = new Map<string, SavedDiagramState>();
const hydration = new Map<string, Promise<SavedDiagramState | null>>();
const pendingSaves = new Map<string, Promise<void>>();

function key(projectId: string, utility: string) {
  return `${projectId}:${utility}`;
}

export function loadDiagramState(projectId: string, utility: string) {
  return stateCache.get(key(projectId, utility)) ?? null;
}

export function hydrateDiagramState(projectId: string, utility: string) {
  const cacheKey = key(projectId, utility);
  const active = hydration.get(cacheKey);
  if (active) return active;
  const request = dbFetch<SavedDiagramState[]>("diagram-states", {
    query: { projectId, utility },
  }).then((rows) => {
    const state = rows[0] ?? null;
    if (pendingSaves.has(cacheKey)) return stateCache.get(cacheKey) ?? state;
    if (state) stateCache.set(cacheKey, state);
    else stateCache.delete(cacheKey);
    return stateCache.get(cacheKey) ?? null;
  }).finally(() => hydration.delete(cacheKey));
  hydration.set(cacheKey, request);
  return request;
}

export function saveDiagramState(state: SavedDiagramState) {
  const cacheKey = key(state.projectId, state.utility);
  stateCache.set(cacheKey, state);
  emitDbChange("diagram-states");
  const previous = pendingSaves.get(cacheKey) ?? Promise.resolve();
  const request = previous
    .catch(() => undefined)
    .then(() => dbFetch("diagram-states", {
      method: "POST",
      body: JSON.stringify(state),
      keepalive: true,
    }))
    .then(() => undefined);
  const tracked = request.finally(() => {
    if (pendingSaves.get(cacheKey) === tracked) pendingSaves.delete(cacheKey);
  });
  pendingSaves.set(cacheKey, tracked);
  void tracked.catch((error) => console.error("Không thể lưu sơ đồ", error));
  return tracked;
}

export function clearDiagramState(projectId: string, utility: string) {
  const cacheKey = key(projectId, utility);
  stateCache.delete(cacheKey);
  emitDbChange("diagram-states");
  const previous = pendingSaves.get(cacheKey) ?? Promise.resolve();
  const request = previous
    .catch(() => undefined)
    .then(() => dbFetch("diagram-states", {
      method: "DELETE",
      query: { projectId, utility, id: "diagram" },
      keepalive: true,
    }))
    .then(() => undefined);
  const tracked = request.finally(() => {
    if (pendingSaves.get(cacheKey) === tracked) pendingSaves.delete(cacheKey);
  });
  pendingSaves.set(cacheKey, tracked);
  void tracked.catch((error) => console.error("Không thể xóa sơ đồ", error));
  return tracked;
}
