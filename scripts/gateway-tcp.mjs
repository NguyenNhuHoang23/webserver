import net from "node:net";

const PORT = Number(process.env.GATEWAY_TCP_PORT || 3010);
const HOST = process.env.GATEWAY_TCP_HOST || "0.0.0.0";
const INGEST =
  process.env.GATEWAY_INGEST_URL || "http://127.0.0.1:3005/api/gateway";
/** Firmware thường gửi JSON rồi đứng đợi ACK, không FIN. Không được chờ `end`. */
const IDLE_MS = Number(process.env.GATEWAY_TCP_IDLE_MS || 400);
const HARD_MS = Number(process.env.GATEWAY_TCP_TIMEOUT_MS || 8000);

function findJsonObject(text) {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function isHttp(text) {
  return /^(POST|PUT|PATCH|GET)\s/i.test(text.trimStart());
}

function extractHttpBody(raw) {
  const split = raw.indexOf("\r\n\r\n");
  if (split < 0) return { complete: false, body: null };
  const header = raw.slice(0, split);
  const rest = raw.slice(split + 4);
  const lengthMatch = header.match(/content-length:\s*(\d+)/i);
  if (lengthMatch) {
    const length = Number(lengthMatch[1]);
    const bytes = Buffer.from(rest, "utf8");
    if (bytes.length < length) return { complete: false, body: null };
    return { complete: true, body: bytes.subarray(0, length).toString("utf8") };
  }
  const json = findJsonObject(rest);
  return json ? { complete: true, body: json } : { complete: false, body: null };
}

function extractJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return findJsonObject(trimmed) || trimmed;
  }
  const http = extractHttpBody(trimmed);
  if (http.body) return http.body.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function payloadReady(raw) {
  if (!raw.trim()) return false;
  if (isHttp(raw)) return extractHttpBody(raw).complete;
  return Boolean(findJsonObject(raw));
}

function wrapHttpAck(jsonText) {
  const body = jsonText.endsWith("\n") ? jsonText : `${jsonText}\n`;
  return (
    "HTTP/1.1 200 OK\r\n" +
    "Content-Type: application/json\r\n" +
    `Content-Length: ${Buffer.byteLength(body)}\r\n` +
    "Connection: close\r\n" +
    "\r\n" +
    body
  );
}

async function ingest(raw) {
  const res = await fetch(INGEST, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: raw,
  });
  const text = await res.text();
  return { status: res.status, text };
}

const server = net.createServer((socket) => {
  const peer = `${socket.remoteAddress?.replace(/^::ffff:/, "")}:${socket.remotePort}`;
  const chunks = [];
  let handled = false;
  let idleTimer = null;

  socket.setNoDelay(true);
  socket.setTimeout(HARD_MS);

  const reply = (payload) => {
    if (socket.destroyed) return;
    socket.end(payload);
  };

  const handle = async (reason) => {
    if (handled) return;
    handled = true;
    if (idleTimer) clearTimeout(idleTimer);
    socket.setTimeout(0);

    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw.trim()) {
      reply("");
      return;
    }
    const json = extractJson(raw);
    console.log(
      `[gateway-tcp] ${new Date().toISOString()} ${peer} ${reason} ${Buffer.byteLength(raw)} bytes ${json.slice(0, 180)}`,
    );
    try {
      const result = await ingest(json);
      console.log(`[gateway-tcp] ingest ${result.status} ${result.text.slice(0, 200)}`);
      const ack = result.text.endsWith("\n") ? result.text : `${result.text}\n`;
      reply(isHttp(raw) ? wrapHttpAck(ack) : ack);
    } catch (err) {
      console.error(`[gateway-tcp] ingest failed ${peer}`, err);
      reply("");
    }
  };

  socket.on("data", (chunk) => {
    if (handled) return;
    chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");
    if (payloadReady(raw)) {
      void handle("complete");
      return;
    }
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      void handle("idle");
    }, IDLE_MS);
  });

  socket.on("timeout", () => {
    void handle("timeout");
  });

  socket.on("end", () => {
    void handle("fin");
  });

  socket.on("error", (err) => {
    handled = true;
    if (idleTimer) clearTimeout(idleTimer);
    console.error(`[gateway-tcp] ${peer} ${err.message}`);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`gateway tcp listening on ${HOST}:${PORT} -> ${INGEST}`);
});
