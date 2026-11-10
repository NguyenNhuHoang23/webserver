import { dbFetch, emitDbChange } from "@/lib/db-client";
import { vietnamTodayLabel } from "@/lib/vietnam-time";

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

export const ACCOUNT_ROLE_META: Record<AccountRole, { label: string; hint: string }> = {
  "Quản trị viên": {
    label: "Quản trị viên",
    hint: "Toàn quyền EMS: người dùng, dự án, thiết bị, gateway, hệ số phát thải",
  },
  "Quản lý dự án": {
    label: "Quản lý dự án",
    hint: "Quản lý dự án, thiết bị và hệ số phát thải",
  },
  "Kỹ sư vận hành": {
    label: "Kỹ sư vận hành",
    hint: "Vận hành thiết bị và gateway",
  },
  "Nhân viên kỹ thuật": {
    label: "Nhân viên kỹ thuật",
    hint: "Xem dự án và cấu hình thiết bị",
  },
};

let accountsCache: Account[] = [];
let accountsHydration: Promise<Account[]> | null = null;

export function loadAccounts(): Account[] {
  return accountsCache;
}

export function todayLabel() {
  return vietnamTodayLabel();
}

export function hydrateAccounts() {
  if (typeof window === "undefined") return Promise.resolve(loadAccounts());
  if (accountsHydration) return accountsHydration;
  accountsHydration = dbFetch<Account[]>("accounts")
    .then((accounts) => {
      accountsCache = Array.isArray(accounts) ? accounts : [];
      emitDbChange("accounts");
      return accountsCache;
    })
    .finally(() => {
      accountsHydration = null;
    });
  return accountsHydration;
}

export async function upsertAccount(account: Account) {
  const rows = await dbFetch<Account[]>("accounts", {
    method: "POST",
    body: JSON.stringify(account),
  });
  accountsCache = Array.isArray(rows) ? rows : [];
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
  accountsCache = accounts;
  emitDbChange("accounts");
  void dbFetch("accounts", {
    method: "POST",
    body: JSON.stringify({ items: accounts }),
  }).catch((error) => console.error("Không thể lưu tài khoản", error));
}
