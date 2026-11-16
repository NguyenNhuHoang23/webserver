import { dbFetch, emitDbChange } from "@/lib/db-client";
import { vietnamTodayLabel } from "@/lib/vietnam-time";

/** Phân cấp tài khoản nội bộ cổng quản trị: Admin | Manage. */
export type AccountRole = "Admin" | "Manage";

export type Account = {
  id: string;
  username: string;
  email: string;
  role: AccountRole;
  createdAt: string;
  password?: string;
  /** Bắt buộc khi tự đổi mật khẩu của chính mình. */
  currentPassword?: string;
  /** Dự án được gán (bắt buộc với Manage; Admin = tất cả). */
  projectIds: string[];
};

export const ACCOUNT_ROLES: AccountRole[] = ["Admin", "Manage"];

export const ACCOUNT_ROLE_META: Record<AccountRole, { label: string; hint: string }> = {
  Admin: {
    label: "Admin",
    hint: "Toàn quyền EMS trên mọi dự án: người dùng nội bộ, dự án, thiết bị, cấu hình.",
  },
  Manage: {
    label: "Manage",
    hint: "Đầy đủ quyền cấu hình trong các dự án được tích chọn gán quyền.",
  },
};

/** Chuẩn hóa role cũ (4 chức danh) → Admin | Manage. */
export function normalizeAccountRole(role: unknown): AccountRole {
  if (role === "Admin" || role === "Quản trị viên") return "Admin";
  return "Manage";
}

export function normalizeAccountProjectIds(role: AccountRole, projectIds?: string[]) {
  if (role === "Admin") return [] as string[];
  return Array.from(new Set((projectIds ?? []).map((item) => item.trim()).filter(Boolean)));
}

let accountsCache: Account[] = [];
let accountsHydration: Promise<Account[]> | null = null;

export function loadAccounts(): Account[] {
  return accountsCache;
}

export function todayLabel() {
  return vietnamTodayLabel();
}

function mapAccount(row: Partial<Account> & { id: string }): Account {
  const role = normalizeAccountRole(row.role);
  return {
    id: row.id,
    username: String(row.username ?? ""),
    email: String(row.email ?? ""),
    role,
    createdAt: String(row.createdAt ?? todayLabel()),
    password: row.password,
    projectIds: normalizeAccountProjectIds(role, row.projectIds),
  };
}

export function hydrateAccounts() {
  if (typeof window === "undefined") return Promise.resolve(loadAccounts());
  if (accountsHydration) return accountsHydration;
  accountsHydration = dbFetch<Account[]>("accounts")
    .then((accounts) => {
      accountsCache = Array.isArray(accounts) ? accounts.map((item) => mapAccount(item)) : [];
      emitDbChange("accounts");
      return accountsCache;
    })
    .finally(() => {
      accountsHydration = null;
    });
  return accountsHydration;
}

export async function upsertAccount(account: Account) {
  const role = normalizeAccountRole(account.role);
  const payload = {
    ...account,
    role,
    projectIds: normalizeAccountProjectIds(role, account.projectIds),
  };
  const rows = await dbFetch<Account[]>("accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  accountsCache = Array.isArray(rows) ? rows.map((item) => mapAccount(item)) : [];
  emitDbChange("accounts");
  return accountsCache;
}

export async function removeAccount(id: string) {
  await dbFetch("accounts", { method: "DELETE", query: { id } });
  accountsCache = accountsCache.filter((item) => item.id !== id);
  emitDbChange("accounts");
  return accountsCache;
}

/** @deprecated Dùng upsertAccount / removeAccount */
export function saveAccounts(accounts: Account[]) {
  accountsCache = accounts.map((item) => mapAccount(item));
  emitDbChange("accounts");
  void dbFetch("accounts", {
    method: "POST",
    body: JSON.stringify({ items: accountsCache }),
  }).catch((error) => console.error("Không thể lưu tài khoản", error));
}
