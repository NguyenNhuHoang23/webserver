import { loadAccounts, type Account } from "@/lib/accounts";
import {
  customerPassword,
  getCustomerAccountForProject,
  loadCustomerAccounts,
  type CustomerAccount,
} from "@/lib/customer-accounts";
import { AUTH_EVENT, AUTH_STORAGE_KEY, DEFAULT_PASSWORD } from "@/lib/auth-constants";

export { DEFAULT_PASSWORD, AUTH_EVENT, AUTH_STORAGE_KEY };

export type AuthPortal = "admin" | "customer";

export type AuthSession = {
  portal: AuthPortal;
  userId: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  projectId?: string;
};

export type AuthResult =
  | { ok: true; session: AuthSession }
  | { ok: false; message: string };

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesPassword(stored: string | undefined, input: string) {
  return input === (stored || DEFAULT_PASSWORD);
}

function matchesLogin(username: string, email: string, identifier: string) {
  const login = normalize(identifier);
  return normalize(username) === login || normalize(email) === login;
}

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.portal || !parsed.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function loginAdmin(identifier: string, password: string): AuthResult {
  if (!identifier.trim() || !password) {
    return { ok: false, message: "Vui lòng nhập tài khoản và mật khẩu." };
  }

  const account = loadAccounts().find((item) => matchesLogin(item.username, item.email, identifier));
  if (!account || !matchesPassword(account.password, password)) {
    return { ok: false, message: "Tài khoản hoặc mật khẩu không đúng." };
  }

  const session = sessionFromAdmin(account);
  writeSession(session);
  return { ok: true, session };
}

export function loginCustomer(identifier: string, password: string, projectId?: string): AuthResult {
  if (!identifier.trim() || !password) {
    return { ok: false, message: "Vui lòng nhập tài khoản và mật khẩu." };
  }

  const pool = projectId
    ? accountsForProject(projectId)
    : loadCustomerAccounts();

  const account = pool.find((item) => matchesLogin(item.username, item.email, identifier));
  if (!account) {
    return {
      ok: false,
      message: projectId
        ? "Tài khoản không thuộc dự án này hoặc không đúng."
        : "Tài khoản hoặc mật khẩu không đúng.",
    };
  }
  if (!matchesPassword(account.password, password)) {
    return { ok: false, message: "Tài khoản hoặc mật khẩu không đúng." };
  }

  const session = sessionFromCustomer(account);
  writeSession(session);
  return { ok: true, session };
}

export function logout() {
  clearSession();
}

export function homePathFor(session: AuthSession) {
  if (session.portal === "customer" && session.projectId) {
    return `/du-an/${session.projectId}`;
  }
  return "/";
}

export function isAuthPath(pathname: string) {
  return pathname === "/dang-nhap" || pathname.startsWith("/dang-nhap/");
}

export function isClientPath(pathname: string) {
  return pathname.startsWith("/du-an/");
}

export function clientProjectId(pathname: string) {
  if (!isClientPath(pathname)) return undefined;
  return pathname.split("/")[2] || undefined;
}

export function canViewClientProject(session: AuthSession | null, projectId?: string) {
  if (!session || !projectId) return false;
  if (session.portal === "admin") return true;
  return session.portal === "customer" && session.projectId === projectId;
}

export function getAuthRedirect(session: AuthSession | null, pathname: string): string | null {
  if (isAuthPath(pathname)) {
    if (session?.portal === "admin" && (pathname === "/dang-nhap" || pathname.startsWith("/dang-nhap/quan-tri"))) {
      return "/";
    }
    if (session?.portal === "customer" && pathname.startsWith("/dang-nhap/khach-hang")) {
      return homePathFor(session);
    }
    return null;
  }

  if (isClientPath(pathname)) return null;

  if (session?.portal === "customer") return homePathFor(session);
  return null;
}

function accountsForProject(projectId: string): CustomerAccount[] {
  const stored = loadCustomerAccounts().filter((item) => item.projectId === projectId);
  if (stored.length) return stored;
  const fallback = getCustomerAccountForProject(projectId);
  return fallback ? [fallback] : [];
}

function sessionFromAdmin(account: Account): AuthSession {
  return {
    portal: "admin",
    userId: account.id,
    username: account.username,
    displayName: account.username,
    email: account.email,
    role: account.role,
  };
}

function sessionFromCustomer(account: CustomerAccount): AuthSession {
  return {
    portal: "customer",
    userId: account.id,
    username: account.username,
    displayName: account.displayName,
    email: account.email,
    role: "Khách hàng",
    projectId: account.projectId,
  };
}

export { customerPassword };
