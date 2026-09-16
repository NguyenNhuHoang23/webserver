import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { emsDb } from "@/lib/server-db";

const SESSION_COOKIE = "ems-session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (token) {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await emsDb.execute("DELETE FROM auth_sessions WHERE token_hash = ?", [tokenHash]);
    }
    cookieStore.delete(SESSION_COOKIE);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Auth logout error", error);
    return Response.json({ error: "Không thể đăng xuất lúc này." }, { status: 500 });
  }
}
