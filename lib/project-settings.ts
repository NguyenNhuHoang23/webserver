import { dbFetch, emitDbChange } from "@/lib/db-client";

export type ProjectSettingsPayload = Record<string, unknown>;

const cache: Record<string, ProjectSettingsPayload | undefined> = {};
const hydration: Record<string, Promise<ProjectSettingsPayload> | undefined> = {};

export function loadProjectSettings(projectId: string): ProjectSettingsPayload | undefined {
  return cache[projectId];
}

export function hydrateProjectSettings(projectId: string) {
  if (typeof window === "undefined") return Promise.resolve(loadProjectSettings(projectId) ?? {});
  if (!hydration[projectId]) {
    hydration[projectId] = dbFetch<Array<{ payload?: ProjectSettingsPayload }>>("project-settings", {
      query: { projectId },
    })
      .then((rows) => {
        cache[projectId] = rows[0]?.payload ?? {};
        return cache[projectId]!;
      })
      .finally(() => {
        hydration[projectId] = undefined;
      });
  }
  return hydration[projectId]!;
}

export async function saveProjectSettings(projectId: string, payload: ProjectSettingsPayload) {
  cache[projectId] = payload;
  const rows = await dbFetch<Array<{ payload?: ProjectSettingsPayload }>>("project-settings", {
    method: "POST",
    body: JSON.stringify({ projectId, payload }),
  });
  cache[projectId] = rows[0]?.payload ?? payload;
  emitDbChange("project-settings");
  return cache[projectId]!;
}
