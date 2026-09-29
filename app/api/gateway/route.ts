import { ingestGateway } from "@/lib/gateway-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    return Response.json(await ingestGateway(raw));
  } catch (error) {
    console.error("Gateway ingest error", error);
    return Response.json({ error: "Không thể lưu bản tin gateway." }, { status: 500 });
  }
}
