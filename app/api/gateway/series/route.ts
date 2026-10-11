import { NextRequest } from "next/server";
import {
  getProjectGatewayDailyEnergy,
  getProjectGatewayDailyRange,
  getProjectGatewayEnergySlots,
  getProjectGatewaySeries,
} from "@/lib/gateway-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  if (!projectId) {
    return Response.json({ error: "Thiếu mã dự án." }, { status: 400 });
  }
  const year = Number(request.nextUrl.searchParams.get("year"));
  const month = Number(request.nextUrl.searchParams.get("month"));
  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "";
  const summary = request.nextUrl.searchParams.get("summary");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam == null ? Number.NaN : Number(limitParam);
  const civilDate = /^\d{4}-\d{2}-\d{2}$/;
  try {
    if (Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12) {
      const summary = await getProjectGatewayDailyEnergy(projectId, year, month);
      return Response.json(summary);
    }
    if (civilDate.test(from) && civilDate.test(to) && summary === "day") {
      const days = await getProjectGatewayDailyRange(projectId, from, to);
      return Response.json(days);
    }
    if (civilDate.test(from) && civilDate.test(to) && summary === "slot") {
      const slots = await getProjectGatewayEnergySlots(projectId, from, to);
      return Response.json(slots);
    }
    const samples = await getProjectGatewaySeries(projectId, {
      from: civilDate.test(from) ? from : undefined,
      to: civilDate.test(to) ? to : undefined,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    });
    return Response.json(samples);
  } catch (error) {
    console.error("Project gateway series error", error);
    return Response.json({ error: "Không thể tải dữ liệu gateway của dự án." }, { status: 500 });
  }
}
