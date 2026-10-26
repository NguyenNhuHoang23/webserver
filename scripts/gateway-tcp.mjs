import net from "node:net";

const PORT = Number(process.env.GATEWAY_TCP_PORT || 3010);
const HOST = process.env.GATEWAY_TCP_HOST || "0.0.0.0";
const INGEST =
  process.env.GATEWAY_INGEST_URL || "http://127.0.0.1:3005/api/gateway";

function extractJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const split = trimmed.indexOf("\r\n\r\n");
  if (split >= 0) {
    const body = trimmed.slice(split + 4).trim();
    if (body.startsWith("{")) return body;
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

async function ingest(raw) {
  const res = await fetch(INGEST, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw,
  });
  const text = await res.text();
  return { status: res.status, text };
}

const server = net.createServer((socket) => {
  const peer = `${socket.remoteAddress.replace(/^::ffff:/, "")}:${socket.remotePort}`;
  const chunks = [];
  socket.on("data", (chunk) => chunks.push(chunk));
  socket.on("error", (err) => {
    console.error(`[gateway-tcp] ${peer} ${err.message}`);
  });
  socket.on("end", async () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw.trim()) return;
    const json = extractJson(raw);
    console.log(
      `[gateway-tcp] ${new Date().toISOString()} ${peer} ${Buffer.byteLength(raw)} bytes ${json.slice(0, 180)}`,
    );
    try {
      const result = await ingest(json);
      console.log(`[gateway-tcp] ingest ${result.status} ${result.text.slice(0, 200)}`);
      if (!socket.destroyed) socket.end(result.text);
    } catch (err) {
      console.error(`[gateway-tcp] ingest failed ${peer}`, err);
      if (!socket.destroyed) socket.end();
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`gateway tcp listening on ${HOST}:${PORT} -> ${INGEST}`);
});
