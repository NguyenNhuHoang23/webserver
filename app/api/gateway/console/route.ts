import { NextRequest } from "next/server";
import {
  deleteGatewayThreshold,
  getGatewayConsole,
  saveGatewayConfig,
  saveGatewayThreshold,
} from "@/lib/gateway-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

function isoParam(value: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const data = await getGatewayConsole({
      from: isoParam(request.nextUrl.searchParams.get("from")),
      to: isoParam(request.nextUrl.searchParams.get("to")),
      gatewayId: request.nextUrl.searchParams.get("gatewayId")?.trim() || undefined,
    });
    return Response.json(data);
  } catch (error) {
    console.error("Gateway console error", error);
    return Response.json({ error: "Không thể tải dữ liệu gateway." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "config") {
      const gatewayId = text(body.gatewayId);
      const timeUpdate = Number(body.timeUpdate);
      if (!gatewayId) return badRequest("Cần gatewayId.");
      if (!Number.isInteger(timeUpdate) || timeUpdate < 1 || timeUpdate > 86400) {
        return badRequest("TimeUpdate phải là số giây từ 1 đến 86400.");
      }
      await saveGatewayConfig({
        gatewayId,
        wifi: optionalText(body.wifi),
        passWifi: optionalText(body.passWifi),
        timeUpdate,
      });
      return Response.json({ ok: true });
    }

    if (action === "threshold") {
      const parameterName = text(body.parameterName);
      const minValue = optionalNumber(body.minValue);
      const maxValue = optionalNumber(body.maxValue);
      if (!parameterName) return badRequest("Cần tên tham số trong values.");
      if (minValue == null && maxValue == null) return badRequest("Cần nhập Min hoặc Max.");
      if (minValue != null && maxValue != null && minValue > maxValue) {
        return badRequest("Min không được lớn hơn Max.");
      }
      await saveGatewayThreshold({
        gatewayId: text(body.gatewayId),
        meterModel: text(body.meterModel),
        meterId: text(body.meterId),
        parameterName,
        minValue,
        maxValue,
      });
      return Response.json({ ok: true });
    }

    if (action === "delete-threshold") {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id < 1) return badRequest("Thiếu id ngưỡng.");
      await deleteGatewayThreshold(id);
      return Response.json({ ok: true });
    }

    return badRequest("Thao tác không hợp lệ.");
  } catch (error) {
    console.error("Gateway console save error", error);
    return Response.json({ error: "Không thể lưu cấu hình gateway." }, { status: 500 });
  }
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown) {
  const result = text(value);
  return result || null;
}

function optionalNumber(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
