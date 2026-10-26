import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Firmware chỉ IP:port thường POST vào "/" — chuyển vào ingest gateway.
  if (request.method === "POST" && (pathname === "/" || pathname === "")) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/gateway";
    return NextResponse.rewrite(url);
  }

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
