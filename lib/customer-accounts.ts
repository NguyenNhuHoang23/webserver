import { DEFAULT_PASSWORD } from "@/lib/auth-constants";
import { dbFetch, emitDbChange } from "@/lib/db-client";
import { loadProjects } from "@/lib/projects";

export type CustomerAccount = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  projectId: string;
  password?: string;
};

let customerAccountsCache: CustomerAccount[] = [];
let customerAccountsHydration: Promise<CustomerAccount[]> | null = null;

export const INITIAL_CUSTOMER_ACCOUNTS: CustomerAccount[] = [
  {
    id: "cus-1",
    username: "khachhang",
    email: "khachhang@sunrise.com",
    displayName: "Sunrise Group",
    projectId: "PRJ-2401",
    password: DEFAULT_PASSWORD,
  },
  {
    id: "cus-2",
    username: "vinamilk",
    email: "ems@vinamilk.com.vn",
    displayName: "Vinamilk",
    projectId: "PRJ-2402",
    password: DEFAULT_PASSWORD,
  },
];

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
    projectId: project.id,
    password: DEFAULT_PASSWORD,
  };
}

export function loadCustomerAccounts(): CustomerAccount[] {
  return customerAccountsCache.length ? customerAccountsCache : INITIAL_CUSTOMER_ACCOUNTS;
}

export function saveCustomerAccounts(accounts: CustomerAccount[]) {
  customerAccountsCache = accounts;
  emitDbChange("customer-accounts");
  for (const account of accounts) {
    void dbFetch("customer-accounts", {
      method: "POST",
      body: JSON.stringify(account),
    }).catch((error) => console.error("Không thể lưu tài khoản khách hàng", error));
  }
}

export function hydrateCustomerAccounts(projectId?: string) {
  if (typeof window === "undefined") return Promise.resolve(loadCustomerAccounts());
  if (customerAccountsHydration) return customerAccountsHydration;
  customerAccountsHydration = dbFetch<CustomerAccount[]>("customer-accounts", {
    query: { projectId },
  })
    .then((accounts) => {
      customerAccountsCache = accounts.length ? accounts : INITIAL_CUSTOMER_ACCOUNTS;
      emitDbChange("customer-accounts");
      return customerAccountsCache;
    })
    .finally(() => {
      customerAccountsHydration = null;
    });
  return customerAccountsHydration;
}

export function upsertCustomerAccount(account: CustomerAccount) {
  const accounts = loadCustomerAccounts();
  const exists = accounts.some((item) => item.id === account.id || item.projectId === account.projectId);
  const next = exists
    ? accounts.map((item) =>
        item.id === account.id || item.projectId === account.projectId ? { ...item, ...account } : item,
      )
    : [account, ...accounts];
  saveCustomerAccounts(next);
  return next;
}

export function getCustomerAccountForProject(projectId: string): CustomerAccount | undefined {
  const stored = loadCustomerAccounts().find((item) => item.projectId === projectId);
  if (stored) return stored;
  const project = loadProjects().find((item) => item.id === projectId);
  if (!project) return undefined;
  return defaultCustomerAccount(project);
}

export function ensureCustomerAccount(project: { id: string; customer: string }) {
  const existing = loadCustomerAccounts().find((item) => item.projectId === project.id);
  if (existing) return existing;
  const created = defaultCustomerAccount(project);
  upsertCustomerAccount(created);
  return created;
}

export function customerPassword(account: CustomerAccount) {
  return account.password || DEFAULT_PASSWORD;
}
