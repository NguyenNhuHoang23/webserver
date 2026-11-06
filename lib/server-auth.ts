import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import type { AuthSession } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";
import { queryRows } from "@/lib/server-db";

const SESSION_COOKIE = "ems-session";

export async function getServerSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const rows = await queryRows<{
      portal: "admin" | "customer";
      userId: string;
      username: string;
      email: string;
      displayName: string;
      role: string;
      projectId: string | null;
    }>(
      `SELECT s.portal, s.user_id AS userId,
              COALESCE(a.username, c.username) AS username,
              COALESCE(a.email, c.email) AS email,
              COALESCE(a.username, c.display_name) AS displayName,
              COALESCE(a.role, c.role, 'View') AS role,
              s.project_id AS projectId
         FROM auth_sessions s
         LEFT JOIN accounts a ON s.portal = 'admin' AND a.id = s.user_id
         LEFT JOIN customer_accounts c ON s.portal = 'customer' AND c.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > NOW()
        LIMIT 1`,
      [createHash("sha256").update(token).digest("hex")],
    );
    const row = rows[0];
    if (!row) return null;
    let projectIds: string[] | undefined;
    if (row.portal === "customer") {
      const links = await queryRows<{ projectId: string }>(
        `SELECT project_id AS projectId FROM customer_account_projects WHERE account_id = ?`,
        [String(row.userId)],
      );
      projectIds = links.map((item) => String(item.projectId)).filter(Boolean);
      if (!projectIds.length && row.projectId) projectIds = [String(row.projectId)];
    }
    const rawRole = String(row.role ?? "");
    const role =
      row.portal === "customer"
        ? rawRole === "Admin"
          ? "Admin"
          : rawRole === "View" || rawRole === "Viewer"
            ? "View"
            : rawRole === "Edit" || rawRole === "Manage" || rawRole === "Editor"
              ? "Edit"
              : "View"
        : rawRole;

    return {
      portal: row.portal,
      userId: String(row.userId),
      username: String(row.username ?? ""),
      displayName: String(row.displayName ?? row.username ?? ""),
      email: String(row.email ?? ""),
      role,
      ...(row.projectId ? { projectId: String(row.projectId) } : {}),
      ...(projectIds?.length ? { projectIds } : {}),
    };
  } catch (error) {
    console.error("getServerSession failed", error);
    return null;
  }
}

export async function requirePermission(permission: Permission) {
  const session = await getServerSession();
  if (!hasPermission(session, permission)) {
    return { session: null as AuthSession | null, ok: false as const };
  }
  return { session, ok: true as const };
}
