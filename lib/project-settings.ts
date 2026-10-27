import { dbFetch, emitDbChange } from "@/lib/db-client";

export type ProjectSettingsPayload = Record<string, unknown>;

const cache: Record<string, ProjectSettingsPayload | undefined> = {};
const hydration: Record<string, Promise<ProjectSettingsPayload> | undefined> = {};

export function loadProjectSettings(projectId: string): ProjectSettingsPayload | undefined {
  return cache[projectId];
}

export function hydrateProjectSettings(projectId: string, options?: { force?: boolean }) {
  if (typeof window === "undefined") return Promise.resolve(loadProjectSettings(projectId) ?? {});
  if (options?.force) hydration[projectId] = undefined;
  if (!hydration[projectId]) {
    hydration[projectId] = dbFetch<Array<{ payload?: ProjectSettingsPayload }>>("project-settings", {
      query: { projectId },
    })
      .then((rows) => {
        const payload = rows[0]?.payload;
        cache[projectId] =
          payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
        return cache[projectId]!;
      })
      .finally(() => {
        hydration[projectId] = undefined;
      });
  }
  return hydration[projectId]!;
}

export async function saveProjectSettings(projectId: string, payload: ProjectSettingsPayload) {
  const rows = await dbFetch<Array<{ payload?: ProjectSettingsPayload }>>("project-settings", {
    method: "POST",
    body: JSON.stringify({ projectId, payload }),
  });
  const next =
    rows[0]?.payload && typeof rows[0].payload === "object" && !Array.isArray(rows[0].payload)
      ? rows[0].payload
      : { ...(cache[projectId] ?? {}), ...payload };
  cache[projectId] = next;
  emitDbChange("project-settings");
  return cache[projectId]!;
}
