import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const actionId = request.headers.get("next-action");
  if (!actionId || /^[A-Za-z0-9_-]{20,}$/.test(actionId)) {
    return NextResponse.next();
  }

  const headers = new Headers(request.headers);
  headers.delete("next-action");
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
