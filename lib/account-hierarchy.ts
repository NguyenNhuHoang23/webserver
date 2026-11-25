import { normalizeAccountRole, type AccountRole } from "@/lib/accounts";

/**
 * Phân cấp tài khoản nội bộ: Admin > Manage.
 *
 * Quy tắc:
 * - Chỉ được sửa, đổi quyền, đặt lại mật khẩu hoặc xóa tài khoản có cấp THẤP HƠN mình.
 * - Tài khoản cùng cấp (Admin ↔ Admin, Manage ↔ Manage) không sửa được nhau.
 * - Không tự sửa cấp quyền của mình (đổi mật khẩu của bản thân xử lý riêng).
 * - Chỉ được gán cấp không vượt quá cấp của mình.
 */

const ROLE_RANK: Record<AccountRole, number> = {
  Manage: 1,
  Admin: 2,
};

export type HierarchyActor = { userId?: string | null; role?: string | null } | null | undefined;

export function internalRoleRank(role: unknown): number {
  return ROLE_RANK[normalizeAccountRole(role)];
}

/** Người thao tác có được sửa/xóa tài khoản `target` không (không tính trường hợp tự sửa). */
export function canManageInternalAccount(
  actor: HierarchyActor,
  target: { id: string; role: unknown },
): boolean {
  if (!actor?.role) return false;
  if (actor.userId && actor.userId === target.id) return false;
  return internalRoleRank(actor.role) > internalRoleRank(target.role);
}

/** Người thao tác có được gán cấp `role` cho tài khoản khác không. */
export function canAssignInternalRole(actor: HierarchyActor, role: unknown): boolean {
  if (!actor?.role) return false;
  return internalRoleRank(actor.role) >= internalRoleRank(role);
}

export const CANNOT_MANAGE_PEER_MESSAGE =
  "Chỉ tài khoản cấp cao hơn mới được sửa, hạ cấp hoặc xóa tài khoản này.";
