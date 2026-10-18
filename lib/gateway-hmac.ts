import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Các trường chữ ký / checksum không đưa vào chuỗi ký HMAC. */
const STRIP_FIELD_RE =
  /,?\s*"(?:checksum|CRC|crc|HMAC|hmac|SIG|signature)"\s*:\s*(?:"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|null|true|false)\s*,?/gi;

export function stripAuthFields(rawText: string) {
  let text = rawText.replace(STRIP_FIELD_RE, "");
  // Dọn dấu phẩy thừa kiểu `{,` `,,` `,}`
  text = text.replace(/\{\s*,/g, "{").replace(/,\s*,/g, ",").replace(/,\s*\}/g, "}");
  return text;
}

/** Chuỗi ký = JSON gốc sau khi bỏ CRC/HMAC (đúng byte firmware gửi). */
export function hmacSigningPayload(rawText: string) {
  return stripAuthFields(rawText);
}

export function signGatewayHmac(secretKey: string, payload: string) {
  return createHmac("sha256", secretKey).update(payload, "utf8").digest("hex");
}

export function verifyGatewayHmac(secretKey: string, payload: string, provided: string | null | undefined) {
  if (!provided?.trim()) return false;
  const actual = provided.trim().replace(/^0x/i, "").toLowerCase();
  const expected = signGatewayHmac(secretKey, payload).toLowerCase();
  if (actual.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(actual, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

export function generateGatewaySecret() {
  return randomBytes(32).toString("hex");
}

export function readHmacFromBody(source: Record<string, unknown>) {
  for (const key of ["HMAC", "hmac", "SIG", "signature"]) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

export function readHmacFromHeaders(headers: Headers | null | undefined) {
  if (!headers) return null;
  return (
    headers.get("x-gateway-hmac")?.trim() ||
    headers.get("x-hmac-signature")?.trim() ||
    headers.get("x-signature")?.trim() ||
    null
  );
}
