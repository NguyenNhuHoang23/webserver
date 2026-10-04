import { NextRequest } from "next/server";
import { getProjectGatewaySeries } from "@/lib/gateway-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  if (!projectId) {
    return Response.json({ error: "Thiếu mã dự án." }, { status: 400 });
  }
  try {
    const samples = await getProjectGatewaySeries(projectId);
    return Response.json(samples);
  } catch (error) {
    console.error("Project gateway series error", error);
    return Response.json({ error: "Không thể tải dữ liệu gateway của dự án." }, { status: 500 });
  }
}
