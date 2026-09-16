import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { queryRows } from "@/lib/server-db";

const SESSION_COOKIE = "ems-session";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

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
              COALESCE(a.role, 'Khách hàng') AS role,
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
    return Response.json({ session });
  } catch (error) {
    console.error("Auth session error", error);
    return Response.json({ error: "Không thể kiểm tra phiên đăng nhập." }, { status: 500 });
  }
}
