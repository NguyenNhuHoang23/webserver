import { DEFAULT_PASSWORD } from "@/lib/auth-constants";
import type { AuthSession } from "@/lib/auth";
import { dbFetch, emitDbChange } from "@/lib/db-client";
import { loadProjects } from "@/lib/projects";

/**
 * Phân cấp tài khoản khách (2 quyền theo yêu cầu):
 * - Admin: quản trị khách hàng, tạo/xóa tài khoản Manage, toàn quyền cấu hình
 * - Manage: xem & chỉnh sửa cấu hình trong phạm vi dự án được gán
 */
export type CustomerAccountRole = "Admin" | "Manage";

export const CUSTOMER_ACCOUNT_ROLES: CustomerAccountRole[] = ["Admin", "Manage"];

/** Tài khoản nhánh do Admin khách tạo — chỉ Manage. */
export const BRANCH_ACCOUNT_ROLES: Array<"Manage"> = ["Manage"];

export const CUSTOMER_ACCOUNT_ROLE_META: Record<
  CustomerAccountRole,
  { label: string; hint: string }
> = {
  Admin: {
    label: "Admin",
    hint: "Quản trị khách hàng: tạo/xóa tài khoản Manage; toàn quyền cấu hình dự án được gán.",
  },
  Manage: {
    label: "Manage",
    hint: "Xem và chỉnh sửa thông số cấu hình trong dự án được gán; không quản lý tài khoản khác.",
  },
};

export type CustomerAccount = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: CustomerAccountRole;
  /** Dự án chính (mặc định khi đăng nhập). */
  projectId: string;
  /** Các dự án tài khoản được phép truy cập. */
  projectIds: string[];
  password?: string;
};

export function normalizeCustomerRole(role: unknown): CustomerAccountRole {
  if (role === "Admin") return "Admin";
  // Manage + các tên cũ (Edit / View) gom về Manage theo phân cấp 2 quyền
  if (
    role === "Manage" ||
    role === "Edit" ||
    role === "Editor" ||
    role === "View" ||
    role === "Viewer" ||
    role === "Người xem"
  ) {
    return "Manage";
  }
  return "Manage";
}

export function isBranchRole(role: unknown): role is "Manage" {
  return normalizeCustomerRole(role) === "Manage";
}

export function canManageBranchAccounts(session: AuthSession | null | undefined) {
  return session?.portal === "customer" && normalizeCustomerRole(session.role) === "Admin";
}

/** Admin hoặc Manage được lưu cấu hình. Staff admin portal luôn được. */
export function canEditClientConfig(session: AuthSession | null | undefined) {
  if (!session) return false;
  if (session.portal === "admin") return true;
  if (session.portal !== "customer") return false;
  const role = normalizeCustomerRole(session.role);
  return role === "Admin" || role === "Manage";
}

/** Tài khoản Admin của cùng khách hàng với dự án (theo dự án chính / dự án được gán). */
export function adminAccountsForProject(
  project: { id: string; customer: string },
  accounts: CustomerAccount[],
  projects: { id: string; customer: string }[],
) {
  const customerProjectIds = new Set(
    projects.filter((item) => item.customer === project.customer).map((item) => item.id),
  );
  return accounts.filter((account) => {
    if (normalizeCustomerRole(account.role) !== "Admin") return false;
    const managedIds = account.projectIds?.length
      ? account.projectIds
      : account.projectId
        ? [account.projectId]
        : [];
    return managedIds.some((id) => id === project.id || customerProjectIds.has(id));
  });
}

let customerAccountsCache: CustomerAccount[] = [];
let customerAccountsHydration: Promise<CustomerAccount[]> | null = null;

export function normalizeProjectIds(projectId: string, projectIds?: string[]) {
  const ids = Array.from(
    new Set([...(projectIds ?? []), projectId].map((item) => item.trim()).filter(Boolean)),
  );
  return {
    projectId: ids.includes(projectId) ? projectId : (ids[0] ?? projectId),
    projectIds: ids.length ? ids : projectId ? [projectId] : [],
  };
}

export function accountManagesProject(account: CustomerAccount, projectId: string) {
  return account.projectIds.includes(projectId) || account.projectId === projectId;
}

export function defaultCustomerAccount(project: {
  id: string;
  customer: string;
}): CustomerAccount {
  const username = project.id.toLowerCase();
  return {
    id: `cus-${project.id}`,
    username,
    email: `${username}@ems.local`,
    displayName: project.customer,
    role: "Admin",
    projectId: project.id,
    projectIds: [project.id],
    password: DEFAULT_PASSWORD,
  };
}

export function loadCustomerAccounts(): CustomerAccount[] {
  return customerAccountsCache;
}

export function saveCustomerAccounts(accounts: CustomerAccount[]) {
  customerAccountsCache = accounts.map((account) => {
    const normalized = normalizeProjectIds(account.projectId, account.projectIds);
    return { ...account, role: normalizeCustomerRole(account.role), ...normalized };
  });
  emitDbChange("customer-accounts");
  for (const account of customerAccountsCache) {
    void dbFetch("customer-accounts", {
      method: "POST",
      body: JSON.stringify(account),
    }).catch((error) => console.error("Không thể lưu tài khoản khách hàng", error));
  }
}

export function hydrateCustomerAccounts(projectId?: string) {
  if (typeof window === "undefined") {
    const all = loadCustomerAccounts();
    return Promise.resolve(projectId ? all.filter((item) => accountManagesProject(item, projectId)) : all);
  }
  if (!customerAccountsHydration) {
    customerAccountsHydration = dbFetch<CustomerAccount[]>("customer-accounts")
      .then((accounts) => {
        customerAccountsCache = accounts.map((account) => {
          const normalized = normalizeProjectIds(account.projectId, account.projectIds);
          return {
            ...account,
            role: normalizeCustomerRole(account.role),
            ...normalized,
          };
        });
        emitDbChange("customer-accounts");
        return customerAccountsCache;
      })
      .finally(() => {
        customerAccountsHydration = null;
      });
  }
  return customerAccountsHydration.then((accounts) =>
    projectId
      ? accounts.filter(
          (item) =>
            normalizeCustomerRole(item.role) === "Admin" || accountManagesProject(item, projectId),
        )
      : accounts,
  );
}

export async function upsertCustomerAccount(account: CustomerAccount) {
  const normalized = {
    ...account,
    role: normalizeCustomerRole(account.role),
    ...normalizeProjectIds(account.projectId, account.projectIds),
  };
  await dbFetch("customer-accounts", {
    method: "POST",
    body: JSON.stringify(normalized),
  });
  const accounts = loadCustomerAccounts();
  const exists = accounts.some((item) => item.id === normalized.id);
  const next = exists
    ? accounts.map((item) => {
        if (item.id !== normalized.id) return item;
        const merged = { ...item, ...normalized };
        if (!normalized.password) merged.password = item.password;
        return merged;
      })
    : [normalized, ...accounts];
  customerAccountsCache = next;
  emitDbChange("customer-accounts");
  return next;
}

export async function removeCustomerAccount(id: string) {
  await dbFetch("customer-accounts", { method: "DELETE", query: { id } });
  customerAccountsCache = loadCustomerAccounts().filter((item) => item.id !== id);
  emitDbChange("customer-accounts");
  return customerAccountsCache;
}

export function getCustomerAccountForProject(projectId: string): CustomerAccount | undefined {
  const stored = loadCustomerAccounts().find((item) => accountManagesProject(item, projectId));
  if (stored) return stored;
  const project = loadProjects().find((item) => item.id === projectId);
  if (!project) return undefined;
  return defaultCustomerAccount(project);
}

export function ensureCustomerAccount(project: { id: string; customer: string }) {
  const existing = loadCustomerAccounts().find((item) => accountManagesProject(item, project.id));
  if (existing) return existing;
  const created = defaultCustomerAccount(project);
  const accounts = loadCustomerAccounts();
  customerAccountsCache = [created, ...accounts];
  emitDbChange("customer-accounts");
  void upsertCustomerAccount(created).catch((error) =>
    console.error("Không thể tạo tài khoản Admin mặc định", error),
  );
  return created;
}

export function customerPassword(account: CustomerAccount) {
  return account.password || DEFAULT_PASSWORD;
}
