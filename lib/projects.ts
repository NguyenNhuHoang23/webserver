export type ProjectStatus = "active" | "maintenance" | "paused";

export type Project = {
  id: string;
  initials: string;
  accent: string;
  name: string;
  customer: string;
  status: ProjectStatus;
  startDate: string;
};

export const projects: Project[] = [
  {
    id: "PRJ-2401",
    initials: "SN",
    accent: "#1a73e8",
    name: "Sunrise Bắc Ninh Factory",
    customer: "Sunrise Group",
    status: "active",
    startDate: "12/03/2023",
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

export function getProject(id: string) {
  return projects.find((project) => project.id === id);
}
