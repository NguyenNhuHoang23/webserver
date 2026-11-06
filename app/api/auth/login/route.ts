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

async function loadCustomerProjectIds(accountId: string) {
  const rows = await queryRows<{ projectId: string }>(
    `SELECT project_id AS projectId FROM customer_account_projects WHERE account_id = ?`,
    [accountId],
  );
  return rows.map((row) => String(row.projectId)).filter(Boolean);
}

async function findCustomerAccount(identifier: string, password: string, projectId?: string) {
  await emsDb
    .query(
      `CREATE TABLE IF NOT EXISTS customer_account_projects (
         account_id VARCHAR(64) NOT NULL,
         project_id VARCHAR(64) NOT NULL,
         PRIMARY KEY (account_id, project_id)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    )
    .catch(() => undefined);

  await emsDb
    .query(
      `ALTER TABLE customer_accounts
         ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'Manage' AFTER display_name`,
    )
    .catch(() => undefined);

  const rows = await queryRows<Record<string, any>>(
    `SELECT id, username, email, COALESCE(role, 'Manage') AS role,
            display_name AS displayName, project_id AS projectId
       FROM customer_accounts
      WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?))
        AND password_hash = SHA2(?, 256)
      LIMIT 1`,
    [identifier, identifier, password],
  );
  const account = rows[0];
  if (!account) return null;

  const rawRole = String(account.role ?? "View");
  const role =
    rawRole === "Admin"
      ? "Admin"
      : rawRole === "View" || rawRole === "Viewer"
        ? "View"
        : rawRole === "Edit" || rawRole === "Manage" || rawRole === "Editor"
          ? "Edit"
          : "View";
  let projectIds = await loadCustomerProjectIds(String(account.id));
  if (!projectIds.length && account.projectId) {
    projectIds = [String(account.projectId)];
    await emsDb
      .execute("INSERT IGNORE INTO customer_account_projects (account_id, project_id) VALUES (?, ?)", [
        account.id,
        account.projectId,
      ])
      .catch(() => undefined);
  }

  if (role !== "Admin" && projectId && !projectIds.includes(projectId)) return null;
  if (role === "Admin" && projectId) {
    // Admin được vào mọi dự án; giữ projectId yêu cầu làm dự án phiên hiện tại.
  } else if (role === "Admin" && !projectIds.length) {
    const allProjects = await queryRows<{ id: string }>("SELECT id FROM projects ORDER BY id");
    projectIds = allProjects.map((row) => String(row.id));
  }

  const activeProjectId =
    projectId && (role === "Admin" || projectIds.includes(projectId))
      ? projectId
      : String(account.projectId || projectIds[0] || "");
  return {
    ...account,
    role,
    projectId: activeProjectId || null,
    projectIds,
  };
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
      account = (await findCustomerAccount(identifier, password, body.projectId)) ?? undefined;
      resolvedPortal = "customer";
    } else {
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
        account = (await findCustomerAccount(identifier, password, body.projectId)) ?? undefined;
        if (account) resolvedPortal = "customer";
      }
    }

    if (!account) {
      return Response.json({ error: "Tài khoản hoặc mật khẩu không đúng." }, { status: 401 });
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
        ...(Array.isArray(account.projectIds) && account.projectIds.length
          ? { projectIds: account.projectIds }
          : {}),
      },
    });
  } catch (error) {
    console.error("Auth login error", error);
    return Response.json({ error: "Không thể đăng nhập lúc này." }, { status: 500 });
  }
}
