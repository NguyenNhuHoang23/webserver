import { dbFetch, emitDbChange } from "@/lib/db-client";

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

let accountsCache: Account[] = [];
let accountsHydration: Promise<Account[]> | null = null;

export function loadAccounts(): Account[] {
  return accountsCache;
}

export function saveAccounts(accounts: Account[]) {
  accountsCache = accounts;
  emitDbChange("accounts");
  void dbFetch("accounts", {
    method: "POST",
    body: JSON.stringify({ items: accounts }),
  }).catch((error) => console.error("Không thể lưu tài khoản", error));
}

export function hydrateAccounts() {
  if (typeof window === "undefined") return Promise.resolve(loadAccounts());
  if (accountsHydration) return accountsHydration;
  accountsHydration = dbFetch<Account[]>("accounts")
    .then((accounts) => {
      accountsCache = accounts;
      emitDbChange("accounts");
      return accountsCache;
    })
    .finally(() => {
      accountsHydration = null;
    });
  return accountsHydration;
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
