import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { emsDb, queryRows } from "@/lib/server-db";

const SESSION_COOKIE = "ems-session";
const SESSION_DAYS = 30;

type Body = {
  portal?: "admin" | "customer";
  identifier?: string;
  password?: string;
  projectId?: string;
  rememberMe?: boolean;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const identifier = body.identifier?.trim();
    const password = body.password ?? "";
    if (!identifier || !password) {
      return Response.json({ error: "Vui lòng nhập tài khoản và mật khẩu." }, { status: 400 });
    }

    let account: Record<string, any> | undefined;
    let resolvedPortal: "admin" | "customer" = body.portal ?? "admin";

    if (body.portal === "admin") {
      const rows = await queryRows<Record<string, any>>(
        `SELECT id, username, email, role, username AS displayName, NULL AS projectId
           FROM accounts
          WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?))
            AND password_hash = SHA2(?, 256)
          LIMIT 1`,
        [identifier, identifier, password],
      );
      account = rows[0];
      resolvedPortal = "admin";
    } else if (body.portal === "customer") {
      const projectFilter = body.projectId ? "AND project_id = ?" : "";
      const params = [identifier, identifier, password];
      if (body.projectId) params.push(body.projectId);
      const rows = await queryRows<Record<string, any>>(
        `SELECT id, username, email, 'Khách hàng' AS role, display_name AS displayName, project_id AS projectId
           FROM customer_accounts
          WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?))
            AND password_hash = SHA2(?, 256) ${projectFilter}
          LIMIT 1`,
        params,
      );
      account = rows[0];
      resolvedPortal = "customer";
    } else {
      // Unified login: check accounts (admin) first, then customer_accounts
      const adminRows = await queryRows<Record<string, any>>(
        `SELECT id, username, email, role, username AS displayName, NULL AS projectId
           FROM accounts
          WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?))
            AND password_hash = SHA2(?, 256)
          LIMIT 1`,
        [identifier, identifier, password],
      );
      if (adminRows[0]) {
        account = adminRows[0];
        resolvedPortal = "admin";
      } else {
        const projectFilter = body.projectId ? "AND project_id = ?" : "";
        const params = [identifier, identifier, password];
        if (body.projectId) params.push(body.projectId);
        const customerRows = await queryRows<Record<string, any>>(
          `SELECT id, username, email, 'Khách hàng' AS role, display_name AS displayName, project_id AS projectId
             FROM customer_accounts
            WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?))
              AND password_hash = SHA2(?, 256) ${projectFilter}
            LIMIT 1`,
          params,
        );
        if (customerRows[0]) {
          account = customerRows[0];
          resolvedPortal = "customer";
        }
      }
    }

    if (!account) {
      return Response.json(
        { error: "Tài khoản hoặc mật khẩu không đúng." },
        { status: 401 },
      );
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + (body.rememberMe === false ? 24 : SESSION_DAYS * 24) * 60 * 60 * 1000);
    await emsDb.execute(
      `INSERT INTO auth_sessions (token_hash, portal, user_id, project_id, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [hashToken(token), resolvedPortal, account.id, account.projectId ?? null, expiresAt],
    );

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });

    return Response.json({
      session: {
        portal: resolvedPortal,
        userId: account.id,
        username: account.username,
        displayName: account.displayName,
        email: account.email,
        role: account.role,
        ...(account.projectId ? { projectId: account.projectId } : {}),
      },
    });
  } catch (error) {
    console.error("Auth login error", error);
    return Response.json({ error: "Không thể đăng nhập lúc này." }, { status: 500 });
  }
}
