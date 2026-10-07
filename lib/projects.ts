import { dbFetch, emitDbChange } from "@/lib/db-client";

export type ProjectStatus = "active" | "maintenance" | "paused";
/** Loại năng lượng / điểm đo — có thể mở rộng (vd: Khí nén) từ cấu hình dự án */
export type MeterType = string;

export const METER_TYPES: MeterType[] = ["Điện", "Nước", "Nhiệt", "Hơi"];
export const EXTRA_METER_TYPE_SUGGESTIONS: MeterType[] = ["Khí nén"];

export type AlertRecipient = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type Project = {
  id: string;
  initials: string;
  accent: string;
  name: string;
  customer: string;
  status: ProjectStatus;
  startDate: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  meterTypes?: MeterType[];
  recipients?: AlertRecipient[];
};

export function resolveMeterTypes(project?: Pick<Project, "meterTypes"> | null): MeterType[] {
  if (project && Array.isArray(project.meterTypes)) {
    return Array.from(new Set(project.meterTypes.filter(Boolean)));
  }
  return [...METER_TYPES];
}

let projectsCache: Project[] = [];
let projectsHydration: Promise<Project[]> | null = null;
const ACCENTS = ["#1a73e8", "#0f9d58", "#7c3aed", "#ea580c", "#0284c7", "#0d9488", "#dc2626", "#2563eb"];

export function getProject(id: string) {
  return projectsCache.find((project) => project.id === id);
}

export function loadProjects(): Project[] {
  return projectsCache;
}

export async function saveProjects(list: Project[]) {
  projectsCache = list;
  emitDbChange("projects");
  const persisted = await dbFetch<Project[]>("projects", {
    method: "POST",
    body: JSON.stringify({ items: list }),
  });
  projectsCache = persisted;
  emitDbChange("projects");
  return persisted;
}

export function hydrateProjects() {
  if (typeof window === "undefined") return Promise.resolve(loadProjects());
  if (projectsHydration) return projectsHydration;
  projectsHydration = dbFetch<Project[]>("projects")
    .then((projects) => {
      projectsCache = projects;
      emitDbChange("projects");
      return projectsCache;
    })
    .finally(() => {
      projectsHydration = null;
    });
  return projectsHydration;
}

export async function upsertProject(project: Project) {
  const saved = await dbFetch<Project[]>("projects", {
    method: "POST",
    body: JSON.stringify(project),
  });
  projectsCache = saved;
  emitDbChange("projects");
  return saved;
}

export async function removeProject(id: string) {
  await dbFetch("projects", { method: "DELETE", query: { id } });
  const next = loadProjects().filter((item) => item.id !== id);
  projectsCache = next;
  emitDbChange("projects");
  return next;
}

export function nextProjectId(list: Project[] = loadProjects()) {
  const nums = list.map((item) => {
    const match = item.id.match(/(\d+)$/);
    return match ? Number(match[1]) : 0;
  });
  const max = nums.length ? Math.max(...nums) : 2400;
  return `PRJ-${max + 1}`;
}

export function projectInitials(source: string) {
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.trim().slice(0, 2).toUpperCase() || "DA";
}

export function projectAccent(id: string) {
  let hash = 0;
  for (const ch of id) hash += ch.charCodeAt(0);
  return ACCENTS[hash % ACCENTS.length];
}

export function formatProjectDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (year && month && day) return `${day}/${month}/${year}`;
  return new Date().toLocaleDateString("vi-VN");
}
