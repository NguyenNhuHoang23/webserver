export const PROTOCOL_VERSION = "1.0";
export const DEFAULT_TIME_UPDATE_SECONDS = 30;
export const CLOCK_SKEW_MS = 20_000;

export const INTERNET_LABEL: Record<string, string> = {
  W: "Wifi",
  S: "SIM",
};

export const METER_TYPE_LABEL: Record<string, string> = {
  E: "Điện (Electricity)",
  W: "Nước (Water)",
  P: "Áp suất (Pressure)",
  F: "Lưu lượng (Flow)",
};

export const DISPOSITION_LABEL: Record<string, string> = {
  accepted: "Đã lưu",
  duplicate: "Bỏ qua: trùng meterModel + meterId + readingTime",
  clock_realtime: "Bỏ qua: realtime lệch giờ server quá 20 giây",
  clock_replay: "Bỏ qua: bản phát lại có readingTime vượt giờ server quá 20 giây",
  gateway_error: "Bỏ qua: Error khác 0",
  checksum: "Bỏ qua: lỗi checksum",
};

const CHECKSUM_KEYS = new Set(["checksum", "CRC", "crc"]);

export type PacketNumber = string | number;

export type NormalizedPacket = {
  protocolVersion: string;
  internet: "W" | "S";
  packetNumber: PacketNumber;
  gatewayId: string;
  gatewayTemperature: string | null;
  gatewayHumidity: string | null;
  meterType: "E" | "W" | "P" | "F";
  meterModel: string;
  meterId: string;
  readingTime: string;
  readingDate: Date;
  isReplay: boolean;
  error: number;
  values: Record<string, unknown>;
  dateTimeAlarm: string | null;
  idAlarm: number | null;
  valueAlarm: number | null;
  checksum: string;
  shortKeys: boolean;
};

export type GatewayParse = {
  ok: boolean;
  code: 1 | 2 | 3;
  reason: string;
  shortKeys: boolean;
  gatewayId: string;
  packetNumber: PacketNumber;
  packet: NormalizedPacket | null;
  raw: unknown;
};

export function gatewayErrorText(code: number) {
  if (code === 0) return "Không lỗi";
  if (code === 1) return "Hết pin CR2032";
  return `Mã lỗi ${code}`;
}

export function alarmName(code: number | null) {
  if (code == null) return null;
  if (code === 1 || code === 3) return "Quá áp";
  if (code === 2) return "Quá dòng";
  return `Mã ${code}`;
}

export function replayLabel(isReplay: boolean) {
  return isReplay ? "Phát lại (T / true)" : "Realtime (F / fail)";
}

export function serverTimeNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function crc16Modbus(input: string) {
  const bytes = new TextEncoder().encode(input);
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const lsb = crc & 1;
      crc = (crc >>> 1) & 0xffff;
      if (lsb) crc ^= 0xa001;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function crc32(input: string) {
  const bytes = new TextEncoder().encode(input);
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const lsb = crc & 1;
      crc = (crc >>> 1) >>> 0;
      if (lsb) crc ^= 0xedb88320;
    }
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function canonicalPayload(value: Record<string, unknown>) {
  const copy: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!CHECKSUM_KEYS.has(key)) copy[key] = item;
  }
  return JSON.stringify(copy);
}

export function checksumMatches(provided: string, payload: string) {
  const actual = provided.trim().replace(/^0x/i, "").toUpperCase();
  const candidates = [crc16Modbus(payload), crc32(payload)];
  return candidates.some((expected) => {
    if (actual === expected) return true;
    if (actual.length <= expected.length && actual.padStart(expected.length, "0") === expected) return true;
    return false;
  });
}

export function buildAck(input: {
  server: 1 | 2 | 3 | 4;
  packetNumber: PacketNumber;
  gatewayId: string;
  serverTime: string;
  timeUpdate: string;
  wifi: string | null;
  passWifi: string | null;
  shortKeys: boolean;
}) {
  if (input.shortKeys) {
    const body: Record<string, unknown> = {
      Server: input.server,
      PV: PROTOCOL_VERSION,
      PN: input.packetNumber,
      GID: input.gatewayId,
      ST: input.serverTime,
      TUD: input.timeUpdate,
      Wifi: input.wifi,
      PASS: input.passWifi,
    };
    body.CRC = crc16Modbus(JSON.stringify(body));
    return body;
  }

  const body: Record<string, unknown> = {
    Server: input.server,
    protocolVersion: PROTOCOL_VERSION,
    Packetnumber: input.packetNumber,
    gatewayId: input.gatewayId,
    SeverTime: input.serverTime,
    TimeUpdate: input.timeUpdate,
    Wifi: input.wifi,
    PassWifi: input.passWifi,
  };
  body.checksum = crc16Modbus(JSON.stringify(body));
  return body;
}

export function parseGatewayPacket(rawText: string): GatewayParse {
  const empty: GatewayParse = {
    ok: false,
    code: 3,
    reason: "Lỗi format: body không phải JSON.",
    shortKeys: false,
    gatewayId: "",
    packetNumber: "",
    packet: null,
    raw: null,
  };

  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    return empty;
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...empty, reason: "Lỗi format: JSON phải là object.", raw };
  }

  const source = raw as Record<string, unknown>;
  const shortKeys = usesShortKeys(source);
  const gatewayId = idText(readField(source, ["gatewayId", "GID"])) ?? "";
  const packetNumber = packetNumberValue(readField(source, ["Packetnumber", "PN"])) ?? "";
  const base = { ...empty, shortKeys, gatewayId, packetNumber, raw };

  const protocolVersion = parseVersion(readField(source, ["protocolVersion", "PV"]));
  const internet = parseInternet(readField(source, ["Internet", "IT"]));
  const meterType = parseMeterType(readField(source, ["meterType", "MT"]));
  const meterModel = idText(readField(source, ["meterModel", "MM"]));
  const meterId = idText(readField(source, ["meterId", "MID"]));
  const reading = parseReadingTime(readField(source, ["readingTime", "TIM"]));
  const isReplay = parseReplay(readField(source, ["isReplay", "RE"]));
  const error = parseError(readField(source, ["Error", "ER"]));
  const valuesField = readField(source, ["values", "VAL"]);
  const checksumField = readField(source, ["checksum", "CRC", "crc"]);

  const missing: string[] = [];
  if (!protocolVersion) missing.push("protocolVersion");
  if (!internet) missing.push("Internet");
  if (packetNumber === "") missing.push("Packetnumber");
  if (!gatewayId) missing.push("gatewayId");
  if (!meterType) missing.push("meterType");
  if (!meterModel) missing.push("meterModel");
  if (!meterId) missing.push("meterId");
  if (!reading) missing.push("readingTime");
  if (isReplay == null) missing.push("isReplay");
  if (error == null) missing.push("Error");
  if (!valuesField || typeof valuesField !== "object" || Array.isArray(valuesField)) missing.push("values");
  if (checksumField == null || String(checksumField).trim() === "") missing.push("checksum");

  if (missing.length || !internet || !meterType || !meterModel || !meterId || !reading || isReplay == null || error == null) {
    return {
      ...base,
      reason: `Lỗi format: thiếu hoặc sai ${missing.join(", ") || "trường bắt buộc"}.`,
    };
  }

  const values = valuesField as Record<string, unknown>;
  const packet: NormalizedPacket = {
    protocolVersion,
    internet,
    packetNumber,
    gatewayId,
    gatewayTemperature: asText(readField(source, ["gatewayTemperature", "GT"])),
    gatewayHumidity: asText(readField(source, ["gatewayHumidity", "GH"])),
    meterType,
    meterModel,
    meterId,
    readingTime: reading.raw,
    readingDate: reading.date,
    isReplay,
    error,
    values,
    dateTimeAlarm: asText(readField(values, ["DateTimeAlarm", "DTA"])),
    idAlarm: finiteInt(readField(values, ["IDAlarm", "IDA"])),
    valueAlarm: finiteNumber(readField(values, ["ValueAlarm", "VALA"])),
    checksum: String(checksumField).trim(),
    shortKeys,
  };

  const payload = canonicalPayload(source);
  if (!checksumMatches(packet.checksum, payload)) {
    return {
      ...base,
      code: 2,
      reason: "Lỗi checksum CRC16/CRC32.",
      packet,
    };
  }

  return { ok: true, code: 1, reason: "", shortKeys, gatewayId, packetNumber, packet, raw };
}

function usesShortKeys(source: Record<string, unknown>) {
  const short = ["PV", "IT", "PN", "GID", "GT", "GH", "MT", "MM", "MID", "TIM", "RE", "ER", "VAL", "CRC"];
  const long = ["protocolVersion", "Internet", "Packetnumber", "gatewayId", "meterType", "values", "checksum"];
  const hasShort = short.some((key) => Object.prototype.hasOwnProperty.call(source, key));
  const hasLong = long.some((key) => Object.prototype.hasOwnProperty.call(source, key));
  return hasShort && !hasLong;
}

function readField(source: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(source, name)) return source[name];
  }
  return undefined;
}

function parseVersion(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? value.toFixed(1) : String(value);
  }
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function parseInternet(value: unknown): "W" | "S" | null {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "w" || text === "wifi") return "W";
  if (text === "s" || text === "sim") return "S";
  return null;
}

function parseMeterType(value: unknown): "E" | "W" | "P" | "F" | null {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "e" || text === "electric" || text === "electricity" || text === "electricity meter") return "E";
  if (text === "w" || text === "water" || text === "water meter") return "W";
  if (text === "p" || text === "pressure" || text === "pressure meter" || text === "pressure metter") return "P";
  if (text === "f" || text === "flow" || text === "flow meter") return "F";
  return null;
}

function parseReplay(value: unknown) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "t" || text === "true") return true;
  if (text === "f" || text === "fail" || text === "false") return false;
  return null;
}

function parseError(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

function parseReadingTime(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return { raw: value.trim(), date };
}

function idText(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function packetNumberValue(value: unknown): PacketNumber | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function asText(value: unknown) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function finiteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function finiteInt(value: unknown) {
  const parsed = finiteNumber(value);
  return parsed == null ? null : Math.trunc(parsed);
}
