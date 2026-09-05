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
  meterTypes?: MeterType[];
  recipients?: AlertRecipient[];
};

export function resolveMeterTypes(project?: Pick<Project, "meterTypes"> | null): MeterType[] {
  const list = project?.meterTypes?.filter(Boolean);
  if (list && list.length > 0) return list;
  return [...METER_TYPES];
}

const STORAGE_KEY = "ems-projects";
const ACCENTS = ["#1a73e8", "#0f9d58", "#7c3aed", "#ea580c", "#0284c7", "#0d9488", "#dc2626", "#2563eb"];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: "PRJ-2401",
    initials: "SN",
    accent: "#1a73e8",
    name: "Sunrise Bắc Ninh Factory",
    customer: "Sunrise Group",
    status: "active",
    startDate: "12/03/2023",
    meterTypes: ["Điện", "Nước", "Nhiệt", "Hơi", "Khí nén"],
  },
  {
    id: "PRJ-2402",
    initials: "VM",
    accent: "#0f9d58",
    name: "Vinamilk Bình Dương Plant",
    customer: "Vinamilk",
    status: "active",
    startDate: "08/01/2024",
  },
  {
    id: "PRJ-2403",
    initials: "SS",
    accent: "#7c3aed",
    name: "Samsung Thái Nguyên Campus",
    customer: "Samsung Vietnam",
    status: "maintenance",
    startDate: "21/11/2022",
  },
  {
    id: "PRJ-2404",
    initials: "TH",
    accent: "#ea580c",
    name: "TH True Milk Nghệ An",
    customer: "TH Group",
    status: "active",
    startDate: "03/06/2023",
  },
  {
    id: "PRJ-2405",
    initials: "FT",
    accent: "#0284c7",
    name: "Formosa Hà Tĩnh Steel",
    customer: "Formosa",
    status: "paused",
    startDate: "15/09/2021",
  },
  {
    id: "PRJ-2406",
    initials: "HV",
    accent: "#1a73e8",
    name: "Hòa Phát Dung Quất",
    customer: "Hòa Phát",
    status: "active",
    startDate: "19/04/2023",
  },
  {
    id: "PRJ-2407",
    initials: "UN",
    accent: "#0d9488",
    name: "Unilever Củ Chi Factory",
    customer: "Unilever",
    status: "active",
    startDate: "02/02/2024",
  },
  {
    id: "PRJ-2408",
    initials: "PN",
    accent: "#dc2626",
    name: "PouYuen Đồng Nai",
    customer: "PouYuen",
    status: "maintenance",
    startDate: "11/08/2022",
  },
  {
    id: "PRJ-2409",
    initials: "NS",
    accent: "#2563eb",
    name: "Nestlé Trị An Plant",
    customer: "Nestlé",
    status: "active",
    startDate: "27/07/2023",
  },
  {
    id: "PRJ-2410",
    initials: "LG",
    accent: "#a21caf",
    name: "LG Display Hải Phòng",
    customer: "LG Vietnam",
    status: "active",
    startDate: "14/05/2023",
  },
  ...Array.from({ length: 32 }, (_, i) => {
    const n = i + 11;
    const pool: Array<Omit<Project, "id" | "initials">> = [
      {
        name: `KCN VSIP ${n}`,
        customer: "VSIP",
        status: "active",
        startDate: "01/03/2024",
        accent: "#1a73e8",
      },
      {
        name: `Nhà máy Dệt may ${n}`,
        customer: "Vinatex",
        status: i % 7 === 0 ? "maintenance" : "active",
        startDate: "18/10/2023",
        accent: "#ea580c",
      },
      {
        name: `Trạm điện mặt trời ${n}`,
        customer: "Trungnam Group",
        status: i % 11 === 0 ? "paused" : "active",
        startDate: "09/12/2022",
        accent: "#0f9d58",
      },
    ];
    const item = pool[i % pool.length];
    return {
      ...item,
      id: `PRJ-24${String(n).padStart(2, "0")}`,
      initials: item.customer.slice(0, 2).toUpperCase(),
    } satisfies Project;
  }),
];

export const projects = INITIAL_PROJECTS;

export function getProject(id: string) {
  const found = INITIAL_PROJECTS.find((project) => project.id === id);
  if (found) return found;
  if (/^PRJ-/i.test(id)) {
    return {
      id,
      initials: "DA",
      accent: "#1a73e8",
      name: "Dự án mới",
      customer: "Khách hàng",
      status: "active",
      startDate: new Date().toLocaleDateString("vi-VN"),
    } satisfies Project;
  }
  return undefined;
}

export function loadProjects(): Project[] {
  if (typeof window === "undefined") return INITIAL_PROJECTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_PROJECTS;
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) && parsed.length ? parsed : INITIAL_PROJECTS;
  } catch {
    return INITIAL_PROJECTS;
  }
}

export function saveProjects(list: Project[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function upsertProject(project: Project) {
  const list = loadProjects();
  const exists = list.some((item) => item.id === project.id);
  const next = exists
    ? list.map((item) => (item.id === project.id ? project : item))
    : [project, ...list];
  saveProjects(next);
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
