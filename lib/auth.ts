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

let sessionCache: AuthSession | null = null;
let sessionHydration: Promise<AuthSession | null> | null = null;

export function readSession(): AuthSession | null {
  return sessionCache;
}

export function writeSession(session: AuthSession) {
  sessionCache = session;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearSession() {
  sessionCache = null;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_EVENT));
}

export async function login(
  identifier: string,
  password: string,
  projectId?: string,
  rememberMe = true,
): Promise<AuthResult> {
  if (!identifier.trim() || !password) {
    return { ok: false, message: "Vui lòng nhập tài khoản và mật khẩu." };
  }
  return loginRequest({ identifier, password, projectId, rememberMe });
}

export async function loginAdmin(identifier: string, password: string, rememberMe = true): Promise<AuthResult> {
  if (!identifier.trim() || !password) {
    return { ok: false, message: "Vui lòng nhập tài khoản và mật khẩu." };
  }
  return loginRequest({ portal: "admin", identifier, password, rememberMe });
}

export async function loginCustomer(
  identifier: string,
  password: string,
  projectId?: string,
  rememberMe = true,
): Promise<AuthResult> {
  if (!identifier.trim() || !password) {
    return { ok: false, message: "Vui lòng nhập tài khoản và mật khẩu." };
  }
  return loginRequest({ portal: "customer", identifier, password, projectId, rememberMe });
}

export async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    clearSession();
  }
}

export function hydrateSession() {
  if (typeof window === "undefined") return Promise.resolve(sessionCache);
  if (sessionHydration) return sessionHydration;
  sessionHydration = fetch("/api/auth/session", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Không thể kiểm tra phiên đăng nhập.");
      const result = (await response.json()) as { session: AuthSession | null };
      sessionCache = result.session;
      window.dispatchEvent(new Event(AUTH_EVENT));
      return sessionCache;
    })
    .finally(() => {
      sessionHydration = null;
    });
  return sessionHydration;
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

async function loginRequest(input: {
  portal?: AuthPortal;
  identifier: string;
  password: string;
  projectId?: string;
  rememberMe: boolean;
}): Promise<AuthResult> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = (await response.json()) as { session?: AuthSession; error?: string };
    if (!response.ok || !result.session) throw new Error(result.error || "Tài khoản hoặc mật khẩu không đúng.");
    writeSession(result.session);
    return { ok: true, session: result.session };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Tài khoản hoặc mật khẩu không đúng.",
    };
  }
}
