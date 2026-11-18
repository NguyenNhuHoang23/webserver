import type { AuthSession } from "@/lib/auth";
import { normalizeAccountRole, type AccountRole } from "@/lib/accounts";

export type Permission =
  | "manageUsers"
  | "manageProjects"
  | "manageDevices"
  | "manageGateway"
  | "manageEmissionFactors"
  | "viewProjects";

/** Admin: toàn hệ thống. Manage: đủ quyền cấu hình (không quản lý user nội bộ). */
const ROLE_PERMISSIONS: Record<AccountRole, Permission[]> = {
  Admin: [
    "manageUsers",
    "manageProjects",
    "manageDevices",
    "manageGateway",
    "manageEmissionFactors",
    "viewProjects",
  ],
  Manage: [
    "manageProjects",
    "manageDevices",
    "manageGateway",
    "manageEmissionFactors",
    "viewProjects",
  ],
};

export function permissionsForRole(role: string | undefined | null): Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[normalizeAccountRole(role)] ?? [];
}

export function hasPermission(session: AuthSession | null | undefined, permission: Permission) {
  if (!session || session.portal !== "admin") return false;
  return permissionsForRole(session.role).includes(permission);
}

export function isAdminRole(session: AuthSession | null | undefined) {
  return hasPermission(session, "manageUsers");
}

/** Quyền tối thiểu để mở từng khu vực quản trị. */
export function permissionForPath(pathname: string): Permission | null {
  // Danh sách / form tài khoản nội bộ: mọi nhân sự admin được vào (tự sửa mk);
  // thêm/sửa người khác vẫn bị chặn trong UI + API bởi manageUsers.
  if (pathname === "/tai-khoan" || pathname.startsWith("/tai-khoan/")) {
    return "viewProjects";
  }
  if (pathname === "/tai-khoan-khach" || pathname.startsWith("/tai-khoan-khach/")) {
    return "manageUsers";
  }
  if (
    pathname === "/tao-du-an" ||
    pathname.startsWith("/tao-du-an/") ||
    pathname.startsWith("/sua-du-an/") ||
    pathname.startsWith("/chinh-sua-du-an/")
  ) {
    return "manageProjects";
  }
  if (pathname === "/gateway" || pathname.startsWith("/gateway/")) return "manageGateway";
  if (pathname === "/thiet-bi" || pathname.startsWith("/thiet-bi/")) return "manageDevices";
  if (pathname === "/he-so-phat-thai" || pathname.startsWith("/he-so-phat-thai/")) {
    return "manageEmissionFactors";
  }
  if (pathname === "/loai-diem-do" || pathname.startsWith("/loai-diem-do/")) {
    return "manageProjects";
  }
  if (pathname === "/mau-dong-ho" || pathname.startsWith("/mau-dong-ho/")) {
    return "manageDevices";
  }
  return null;
}

export function canAccessPath(session: AuthSession | null | undefined, pathname: string) {
  const required = permissionForPath(pathname);
  if (!required) return true;
  return hasPermission(session, required);
}
