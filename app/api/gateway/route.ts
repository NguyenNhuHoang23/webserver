import { ingestGateway } from "@/lib/gateway-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function ackResponse(payload: unknown, status = 200) {
  const body = `${JSON.stringify(payload)}\n`;
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "close",
    },
  });
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    console.log(`[gateway] ${new Date().toISOString()} ${raw}`);
    return ackResponse(await ingestGateway(raw, request.headers));
  } catch (error) {
    console.error("Gateway ingest error", error);
    return ackResponse({ error: "Không thể lưu bản tin gateway." }, 500);
  }
}
