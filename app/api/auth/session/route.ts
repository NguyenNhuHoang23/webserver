import { cookies } from "next/headers";
import { queryRows } from "@/lib/server-db";

const SESSION_COOKIE = "ems-session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return Response.json({ session: null });
    const rows = await queryRows<Record<string, unknown>>(
      `SELECT s.portal, s.user_id AS userId,
              COALESCE(a.username, c.username) AS username,
              COALESCE(a.email, c.email) AS email,
              COALESCE(a.username, c.display_name) AS displayName,
              COALESCE(a.role, c.role, 'View') AS role,
              s.project_id AS projectId
         FROM auth_sessions s
         LEFT JOIN accounts a ON s.portal = 'admin' AND a.id = s.user_id
         LEFT JOIN customer_accounts c ON s.portal = 'customer' AND c.id = s.user_id
        WHERE s.token_hash = SHA2(?, 256) AND s.expires_at > NOW()
        LIMIT 1`,
      [token],
    );
    const session = rows[0];
    if (!session) {
      cookieStore.delete(SESSION_COOKIE);
      return Response.json({ session: null });
    }

    let projectIds: string[] | undefined;
    if (session.portal === "customer" && session.userId) {
      const links = await queryRows<{ projectId: string }>(
        `SELECT project_id AS projectId FROM customer_account_projects WHERE account_id = ?`,
        [String(session.userId)],
      );
      projectIds = links.map((row) => String(row.projectId)).filter(Boolean);
      if (!projectIds.length && session.projectId) projectIds = [String(session.projectId)];
    }

    const rawRole = String(session.role ?? "");
    const role =
      session.portal === "customer"
        ? rawRole === "Admin"
          ? "Admin"
          : rawRole === "View" || rawRole === "Viewer"
            ? "View"
            : rawRole === "Edit" || rawRole === "Manage" || rawRole === "Editor"
              ? "Edit"
              : "View"
        : rawRole;

    return Response.json({
      session: {
        ...session,
        role,
        ...(projectIds?.length ? { projectIds } : {}),
      },
    });
  } catch (error) {
    console.error("Auth session error", error);
    return Response.json({ error: "Không thể kiểm tra phiên đăng nhập." }, { status: 500 });
  }
}
