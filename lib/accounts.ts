export type AccountRole =
  | "Quản trị viên"
  | "Kỹ sư vận hành"
  | "Quản lý dự án"
  | "Nhân viên kỹ thuật";

export type Account = {
  id: string;
  username: string;
  email: string;
  role: AccountRole;
  createdAt: string;
  password?: string;
};

export const ACCOUNT_ROLES: AccountRole[] = [
  "Quản trị viên",
  "Kỹ sư vận hành",
  "Quản lý dự án",
  "Nhân viên kỹ thuật",
];

const STORAGE_KEY = "ems-accounts";

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: "acc-1",
    username: "admin_system",
    email: "admin@ems-precision.com",
    role: "Quản trị viên",
    createdAt: "01/01/2024",
  },
  {
    id: "acc-2",
    username: "kisu_vanhanh",
    email: "operator01@sunergy.com",
    role: "Kỹ sư vận hành",
    createdAt: "15/06/2023",
  },
  {
    id: "acc-3",
    username: "quanly_duan",
    email: "manager.pro@fujikin.vn",
    role: "Quản lý dự án",
    createdAt: "01/10/2023",
  },
  {
    id: "acc-4",
    username: "nhanvien_kythuat",
    email: "tech.support@ems.com",
    role: "Nhân viên kỹ thuật",
    createdAt: "20/12/2023",
  },
  {
    id: "acc-5",
    username: "admin_chinhanh",
    email: "admin.hn@ems.com",
    role: "Quản trị viên",
    createdAt: "05/02/2024",
  },
  {
    id: "acc-6",
    username: "kisu_baotri",
    email: "maintenance@sunergy.com",
    role: "Kỹ sư vận hành",
    createdAt: "12/03/2024",
  },
  {
    id: "acc-7",
    username: "quanly_nangluong",
    email: "energy.lead@fujikin.vn",
    role: "Quản lý dự án",
    createdAt: "08/11/2023",
  },
  {
    id: "acc-8",
    username: "kythuat_hotro",
    email: "helpdesk@ems.com",
    role: "Nhân viên kỹ thuật",
    createdAt: "22/01/2024",
  },
  {
    id: "acc-9",
    username: "operator_shift2",
    email: "operator02@sunergy.com",
    role: "Kỹ sư vận hành",
    createdAt: "18/07/2023",
  },
  {
    id: "acc-10",
    username: "pm_thainguyen",
    email: "pm.tn@fujikin.vn",
    role: "Quản lý dự án",
    createdAt: "04/04/2024",
  },
  {
    id: "acc-11",
    username: "tech_field",
    email: "field.tech@ems.com",
    role: "Nhân viên kỹ thuật",
    createdAt: "29/09/2023",
  },
  {
    id: "acc-12",
    username: "auditor_ghg",
    email: "auditor@ems-precision.com",
    role: "Quản trị viên",
    createdAt: "11/05/2024",
  },
];

export function loadAccounts(): Account[] {
  if (typeof window === "undefined") return INITIAL_ACCOUNTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_ACCOUNTS;
    const parsed = JSON.parse(raw) as Account[];
    return Array.isArray(parsed) && parsed.length ? parsed : INITIAL_ACCOUNTS;
  } catch {
    return INITIAL_ACCOUNTS;
  }
}

export function saveAccounts(accounts: Account[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function upsertAccount(account: Account) {
  const accounts = loadAccounts();
  const exists = accounts.some((item) => item.id === account.id);
  const next = exists
    ? accounts.map((item) => (item.id === account.id ? account : item))
    : [account, ...accounts];
  saveAccounts(next);
  return next;
}

export function removeAccount(id: string) {
  const next = loadAccounts().filter((item) => item.id !== id);
  saveAccounts(next);
  return next;
}

export function todayLabel() {
  return new Date().toLocaleDateString("vi-VN");
}
