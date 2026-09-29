import "server-only";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { emsDb, jsonField, queryRows } from "@/lib/server-db";
import {
  CLOCK_SKEW_MS,
  DEFAULT_TIME_UPDATE_SECONDS,
  alarmName,
  buildAck,
  finiteNumber,
  gatewayErrorText,
  parseGatewayPacket,
  serverTimeNow,
  type NormalizedPacket,
  type PacketNumber,
} from "@/lib/gateway-protocol";

type ThresholdRow = {
  gateway_id: string;
  meter_model: string;
  meter_id: string;
  parameter_name: string;
  min_value: number | string | null;
  max_value: number | string | null;
};

export type GatewayConsole = {
  serverTime: string;
  gateways: GatewayDeviceView[];
  stats: GatewayStats;
  packets: GatewayPacketView[];
  packetCount: number;
  alarms: GatewayAlarmView[];
  alarmCount: number;
  logs: GatewayLogView[];
  logCount: number;
  thresholds: GatewayThresholdView[];
  parameters: string[];
};

export type GatewayDeviceView = {
  gatewayId: string;
  protocolVersion: string | null;
  internet: string | null;
  temperature: string | null;
  humidity: string | null;
  packetNumber: string | null;
  meterType: string | null;
  meterModel: string | null;
  meterId: string | null;
  lastReadingTime: string | null;
  lastIsReplay: boolean | null;
  lastError: number | null;
  lastValues: Record<string, unknown> | null;
  lastDisposition: string | null;
  lastSeenAt: string | null;
  wifi: string | null;
  passWifi: string | null;
  timeUpdate: number;
};

export type GatewayStats = {
  total: number;
  wifi: number;
  sim: number;
  realtime: number;
  replay: number;
  accepted: number;
  ignored: number;
};

export type GatewayPacketView = {
  id: number;
  receivedAt: string;
  disposition: string;
  protocolVersion: string;
  internet: string;
  packetNumber: string;
  gatewayId: string;
  gatewayTemperature: string | null;
  gatewayHumidity: string | null;
  meterType: string;
  meterModel: string;
  meterId: string;
  readingTime: string;
  isReplay: boolean;
  error: number;
  values: Record<string, unknown>;
  dateTimeAlarm: string | null;
  idAlarm: number | null;
  valueAlarm: number | null;
  checksum: string;
  rawText: string;
};

export type GatewayAlarmView = {
  id: number;
  source: "gateway" | "threshold";
  gatewayId: string;
  meterModel: string | null;
  meterId: string | null;
  occurredAt: string | null;
  alarmCode: number | null;
  alarmName: string | null;
  alarmValue: number | null;
  parameterName: string | null;
  parameterValue: number | null;
  minValue: number | null;
  maxValue: number | null;
  packetId: number | null;
  createdAt: string;
};

export type GatewayLogView = {
  id: number;
  receivedAt: string;
  level: string;
  reason: string;
  gatewayId: string | null;
  meterModel: string | null;
  meterId: string | null;
  readingTime: string | null;
  packetNumber: string | null;
  rawText: string | null;
};

export type GatewayThresholdView = {
  id: number;
  gatewayId: string;
  meterModel: string;
  meterId: string;
  parameterName: string;
  minValue: number | null;
  maxValue: number | null;
};

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS gateway_devices (
    gateway_id VARCHAR(64) NOT NULL,
    protocol_version VARCHAR(20) NULL,
    internet CHAR(1) NULL,
    gateway_temperature VARCHAR(64) NULL,
    gateway_humidity VARCHAR(64) NULL,
    packet_number VARCHAR(64) NULL,
    meter_type CHAR(1) NULL,
    meter_model VARCHAR(191) NULL,
    meter_id VARCHAR(191) NULL,
    last_reading_time VARCHAR(64) NULL,
    last_is_replay TINYINT(1) NULL,
    last_error INT NULL,
    last_values JSON NULL,
    last_disposition VARCHAR(32) NULL,
    last_seen_at VARCHAR(40) NULL,
    wifi_ssid VARCHAR(191) NULL,
    wifi_password VARCHAR(191) NULL,
    time_update_seconds INT NOT NULL DEFAULT 30,
    PRIMARY KEY (gateway_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS gateway_reading_keys (
    meter_model VARCHAR(191) NOT NULL,
    meter_id VARCHAR(191) NOT NULL,
    reading_time_raw VARCHAR(64) NOT NULL,
    PRIMARY KEY (meter_model, meter_id, reading_time_raw)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS gateway_packets (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    received_at VARCHAR(40) NOT NULL,
    disposition VARCHAR(32) NOT NULL,
    protocol_version VARCHAR(20) NOT NULL,
    internet CHAR(1) NOT NULL,
    packet_number VARCHAR(64) NOT NULL,
    gateway_id VARCHAR(64) NOT NULL,
    gateway_temperature VARCHAR(64) NULL,
    gateway_humidity VARCHAR(64) NULL,
    meter_type CHAR(1) NOT NULL,
    meter_model VARCHAR(191) NOT NULL,
    meter_id VARCHAR(191) NOT NULL,
    reading_time_raw VARCHAR(64) NOT NULL,
    is_replay TINYINT(1) NOT NULL,
    error_code INT NOT NULL,
    values_json JSON NOT NULL,
    date_time_alarm VARCHAR(64) NULL,
    id_alarm INT NULL,
    value_alarm DECIMAL(20,6) NULL,
    checksum VARCHAR(64) NOT NULL,
    raw_text MEDIUMTEXT NOT NULL,
    PRIMARY KEY (id),
    KEY idx_gateway_packets_received (received_at),
    KEY idx_gateway_packets_gateway (gateway_id, received_at),
    KEY idx_gateway_packets_identity (meter_model, meter_id, reading_time_raw)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS gateway_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    received_at VARCHAR(40) NOT NULL,
    level VARCHAR(20) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    gateway_id VARCHAR(64) NULL,
    meter_model VARCHAR(191) NULL,
    meter_id VARCHAR(191) NULL,
    reading_time_raw VARCHAR(64) NULL,
    packet_number VARCHAR(64) NULL,
    raw_text MEDIUMTEXT NULL,
    PRIMARY KEY (id),
    KEY idx_gateway_logs_received (received_at),
    KEY idx_gateway_logs_gateway (gateway_id, received_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS gateway_alarms (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    source VARCHAR(20) NOT NULL,
    gateway_id VARCHAR(64) NOT NULL,
    meter_model VARCHAR(191) NULL,
    meter_id VARCHAR(191) NULL,
    occurred_at VARCHAR(64) NULL,
    alarm_code INT NULL,
    alarm_name VARCHAR(120) NULL,
    alarm_value DECIMAL(20,6) NULL,
    parameter_name VARCHAR(120) NULL,
    parameter_value DECIMAL(20,6) NULL,
    min_value DECIMAL(20,6) NULL,
    max_value DECIMAL(20,6) NULL,
    packet_id BIGINT UNSIGNED NULL,
    created_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_gateway_alarms_created (created_at),
    KEY idx_gateway_alarms_gateway (gateway_id, created_at),
    KEY idx_gateway_alarms_source (source, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS gateway_thresholds (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    gateway_id VARCHAR(64) NOT NULL DEFAULT '',
    meter_model VARCHAR(191) NOT NULL DEFAULT '',
    meter_id VARCHAR(191) NOT NULL DEFAULT '',
    parameter_name VARCHAR(120) NOT NULL,
    min_value DECIMAL(20,6) NULL,
    max_value DECIMAL(20,6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_gateway_threshold (gateway_id, meter_model, meter_id, parameter_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

let schemaReady: Promise<void> | null = null;

export function ensureGatewaySchema() {
  schemaReady ??= createSchema().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

async function createSchema() {
  for (const statement of STATEMENTS) {
    await emsDb.query(statement);
  }
  await emsDb.query(
    "INSERT IGNORE INTO schema_migrations (version) VALUES ('2026-09-23-gateway-server-1')",
  ).catch(() => undefined);
}

export async function ingestGateway(rawText: string) {
  await ensureGatewaySchema();
  const receivedAt = new Date().toISOString();
  const parsed = parseGatewayPacket(rawText);
  const config = await loadConfig(parsed.gatewayId);

  if (!parsed.packet) {
    await insertLog({
      receivedAt,
      level: "log",
      reason: parsed.reason,
      gatewayId: parsed.gatewayId || null,
      meterModel: null,
      meterId: null,
      readingTime: null,
      packetNumber: parsed.packetNumber === "" ? null : String(parsed.packetNumber),
      rawText,
    });
    return buildAck({
      server: 3,
      packetNumber: parsed.packetNumber,
      gatewayId: parsed.gatewayId,
      serverTime: serverTimeNow(),
      timeUpdate: String(config.timeUpdate),
      wifi: config.wifi,
      passWifi: config.passWifi,
      shortKeys: parsed.shortKeys,
    });
  }

  const packet = parsed.packet;
  let server: 1 | 2 | 4 = parsed.ok ? 1 : 2;
  let disposition = parsed.ok ? "accepted" : "checksum";
  const notes: Array<{ level: string; reason: string }> = [];

  if (!parsed.ok) {
    notes.push({ level: "log", reason: parsed.reason });
  } else {
    const duplicate = await readingExists(packet);
    if (duplicate) {
      disposition = "duplicate";
      server = 4;
      notes.push({
        level: "log",
        reason: "Sai readingTime: đã tồn tại cùng meterModel, meterId và readingTime.",
      });
    } else {
      const delta = packet.readingDate.getTime() - Date.now();
      if (!packet.isReplay && Math.abs(delta) > CLOCK_SKEW_MS) {
        disposition = "clock_realtime";
        server = 4;
        notes.push({
          level: "log",
          reason: "Gateway sai Time: isReplay=fail và readingTime lệch quá 20 giây so với giờ server.",
        });
      } else if (packet.isReplay && delta > CLOCK_SKEW_MS) {
        disposition = "clock_replay";
        server = 4;
        notes.push({
          level: "log",
          reason: "Gateway sai Time khi mất mạng: isReplay=true và readingTime lớn hơn giờ server quá 20 giây.",
        });
      }
    }

    if (packet.error !== 0) {
      notes.push({
        level: "warning",
        reason: `Error=${packet.error} (${gatewayErrorText(packet.error)}). Bản tin bị bỏ qua.`,
      });
      if (disposition === "accepted") {
        disposition = "gateway_error";
        server = 4;
      }
    }
  }

  const connection = await emsDb.getConnection();
  try {
    await connection.beginTransaction();
    if (disposition === "accepted") {
      try {
        await connection.execute(
          `INSERT INTO gateway_reading_keys (meter_model, meter_id, reading_time_raw) VALUES (?, ?, ?)`,
          [packet.meterModel, packet.meterId, packet.readingTime],
        );
      } catch (error) {
        if (!isDuplicate(error)) throw error;
        disposition = "duplicate";
        server = 4;
        notes.push({
          level: "log",
          reason: "Sai readingTime: đã tồn tại cùng meterModel, meterId và readingTime.",
        });
      }
    }

    const [inserted] = await connection.execute<ResultSetHeader>(
      `INSERT INTO gateway_packets (
        received_at, disposition, protocol_version, internet, packet_number, gateway_id,
        gateway_temperature, gateway_humidity, meter_type, meter_model, meter_id,
        reading_time_raw, is_replay, error_code, values_json, date_time_alarm,
        id_alarm, value_alarm, checksum, raw_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        receivedAt,
        disposition,
        packet.protocolVersion,
        packet.internet,
        String(packet.packetNumber),
        packet.gatewayId,
        packet.gatewayTemperature,
        packet.gatewayHumidity,
        packet.meterType,
        packet.meterModel,
        packet.meterId,
        packet.readingTime,
        packet.isReplay ? 1 : 0,
        packet.error,
        JSON.stringify(packet.values),
        packet.dateTimeAlarm,
        packet.idAlarm,
        packet.valueAlarm,
        packet.checksum,
        rawText,
      ],
    );
    const packetId = Number(inserted.insertId);

    if (disposition === "accepted") {
      await insertAcceptedAlarms(connection, packet, packetId, receivedAt);
    }

    await connection.execute(
      `INSERT INTO gateway_devices (
        gateway_id, protocol_version, internet, gateway_temperature, gateway_humidity,
        packet_number, meter_type, meter_model, meter_id, last_reading_time, last_is_replay,
        last_error, last_values, last_disposition, last_seen_at, time_update_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        protocol_version = VALUES(protocol_version),
        internet = VALUES(internet),
        gateway_temperature = VALUES(gateway_temperature),
        gateway_humidity = VALUES(gateway_humidity),
        packet_number = VALUES(packet_number),
        meter_type = VALUES(meter_type),
        meter_model = VALUES(meter_model),
        meter_id = VALUES(meter_id),
        last_reading_time = IF(VALUES(last_disposition) = 'accepted', VALUES(last_reading_time), last_reading_time),
        last_is_replay = IF(VALUES(last_disposition) = 'accepted', VALUES(last_is_replay), last_is_replay),
        last_error = VALUES(last_error),
        last_values = IF(VALUES(last_disposition) = 'accepted', VALUES(last_values), last_values),
        last_disposition = VALUES(last_disposition),
        last_seen_at = VALUES(last_seen_at)`,
      [
        packet.gatewayId,
        packet.protocolVersion,
        packet.internet,
        packet.gatewayTemperature,
        packet.gatewayHumidity,
        String(packet.packetNumber),
        packet.meterType,
        packet.meterModel,
        packet.meterId,
        disposition === "accepted" ? packet.readingTime : null,
        disposition === "accepted" ? (packet.isReplay ? 1 : 0) : null,
        packet.error,
        disposition === "accepted" ? JSON.stringify(packet.values) : null,
        disposition,
        receivedAt,
        DEFAULT_TIME_UPDATE_SECONDS,
      ],
    );

    for (const note of notes) {
      await connection.execute(
        `INSERT INTO gateway_logs (
          received_at, level, reason, gateway_id, meter_model, meter_id, reading_time_raw, packet_number, raw_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receivedAt,
          note.level,
          note.reason,
          packet.gatewayId,
          packet.meterModel,
          packet.meterId,
          packet.readingTime,
          String(packet.packetNumber),
          rawText,
        ],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return buildAck({
    server,
    packetNumber: packet.packetNumber,
    gatewayId: packet.gatewayId,
    serverTime: serverTimeNow(),
    timeUpdate: String(config.timeUpdate),
    wifi: config.wifi,
    passWifi: config.passWifi,
    shortKeys: packet.shortKeys,
  });
}

export async function getGatewayConsole(input: { from?: string; to?: string; gatewayId?: string }): Promise<GatewayConsole> {
  await ensureGatewaySchema();
  const filters = ["1=1"];
  const params: string[] = [];
  if (input.from) {
    filters.push("received_at >= ?");
    params.push(input.from);
  }
  if (input.to) {
    filters.push("received_at <= ?");
    params.push(input.to);
  }
  if (input.gatewayId) {
    filters.push("gateway_id = ?");
    params.push(input.gatewayId);
  }
  const where = filters.join(" AND ");

  const alarmFilters = ["1=1"];
  const alarmParams: string[] = [];
  if (input.from) {
    alarmFilters.push("created_at >= ?");
    alarmParams.push(input.from);
  }
  if (input.to) {
    alarmFilters.push("created_at <= ?");
    alarmParams.push(input.to);
  }
  if (input.gatewayId) {
    alarmFilters.push("gateway_id = ?");
    alarmParams.push(input.gatewayId);
  }
  const alarmWhere = alarmFilters.join(" AND ");

  const [gateways, statsRows, packetCountRows, packets, alarmCountRows, alarms, logCountRows, logs, thresholds] =
    await Promise.all([
      queryRows<RowDataPacket>("SELECT * FROM gateway_devices ORDER BY last_seen_at DESC, gateway_id"),
      queryRows<RowDataPacket>(
        `SELECT COUNT(*) AS total,
                SUM(internet = 'W') AS wifi,
                SUM(internet = 'S') AS sim,
                SUM(is_replay = 0) AS realtime,
                SUM(is_replay = 1) AS replay,
                SUM(disposition = 'accepted') AS accepted,
                SUM(disposition <> 'accepted') AS ignored
           FROM gateway_packets WHERE ${where}`,
        params,
      ),
      queryRows<RowDataPacket>(`SELECT COUNT(*) AS total FROM gateway_packets WHERE ${where}`, params),
      queryRows<RowDataPacket>(
        `SELECT * FROM gateway_packets WHERE ${where} ORDER BY received_at DESC, id DESC LIMIT 500`,
        params,
      ),
      queryRows<RowDataPacket>(`SELECT COUNT(*) AS total FROM gateway_alarms WHERE ${alarmWhere}`, alarmParams),
      queryRows<RowDataPacket>(
        `SELECT * FROM gateway_alarms WHERE ${alarmWhere} ORDER BY created_at DESC, id DESC LIMIT 500`,
        alarmParams,
      ),
      queryRows<RowDataPacket>(`SELECT COUNT(*) AS total FROM gateway_logs WHERE ${where}`, params),
      queryRows<RowDataPacket>(
        `SELECT * FROM gateway_logs WHERE ${where} ORDER BY received_at DESC, id DESC LIMIT 300`,
        params,
      ),
      queryRows<RowDataPacket>(
        `SELECT * FROM gateway_thresholds
          WHERE (? = '' OR gateway_id = '' OR gateway_id = ?)
          ORDER BY gateway_id, meter_model, meter_id, parameter_name`,
        [input.gatewayId ?? "", input.gatewayId ?? ""],
      ),
    ]);

  const packetViews = packets.map(mapPacket);
  const parameters = new Set<string>();
  for (const gateway of gateways) {
    collectParameters(jsonField<Record<string, unknown> | null>(gateway.last_values, null), parameters);
  }
  for (const packet of packetViews) collectParameters(packet.values, parameters);

  const stats = statsRows[0] ?? {};
  return {
    serverTime: serverTimeNow(),
    gateways: gateways.map(mapDevice),
    stats: {
      total: asCount(stats.total),
      wifi: asCount(stats.wifi),
      sim: asCount(stats.sim),
      realtime: asCount(stats.realtime),
      replay: asCount(stats.replay),
      accepted: asCount(stats.accepted),
      ignored: asCount(stats.ignored),
    },
    packets: packetViews,
    packetCount: asCount(packetCountRows[0]?.total),
    alarms: alarms.map(mapAlarm),
    alarmCount: asCount(alarmCountRows[0]?.total),
    logs: logs.map(mapLog),
    logCount: asCount(logCountRows[0]?.total),
    thresholds: thresholds.map(mapThreshold),
    parameters: [...parameters].sort(),
  };
}

export async function saveGatewayConfig(input: {
  gatewayId: string;
  wifi: string | null;
  passWifi: string | null;
  timeUpdate: number;
}) {
  await ensureGatewaySchema();
  await emsDb.execute(
    `INSERT INTO gateway_devices (gateway_id, wifi_ssid, wifi_password, time_update_seconds)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       wifi_ssid = VALUES(wifi_ssid),
       wifi_password = VALUES(wifi_password),
       time_update_seconds = VALUES(time_update_seconds)`,
    [input.gatewayId, input.wifi, input.passWifi, input.timeUpdate],
  );
}

export async function saveGatewayThreshold(input: {
  gatewayId: string;
  meterModel: string;
  meterId: string;
  parameterName: string;
  minValue: number | null;
  maxValue: number | null;
}) {
  await ensureGatewaySchema();
  await emsDb.execute(
    `INSERT INTO gateway_thresholds (gateway_id, meter_model, meter_id, parameter_name, min_value, max_value)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE min_value = VALUES(min_value), max_value = VALUES(max_value)`,
    [input.gatewayId, input.meterModel, input.meterId, input.parameterName, input.minValue, input.maxValue],
  );
}

export async function deleteGatewayThreshold(id: number) {
  await ensureGatewaySchema();
  await emsDb.execute("DELETE FROM gateway_thresholds WHERE id = ?", [id]);
}

async function readingExists(packet: NormalizedPacket) {
  const rows = await queryRows<RowDataPacket>(
    `SELECT 1 AS ok FROM gateway_reading_keys
      WHERE meter_model = ? AND meter_id = ? AND reading_time_raw = ? LIMIT 1`,
    [packet.meterModel, packet.meterId, packet.readingTime],
  );
  return rows.length > 0;
}

async function loadConfig(gatewayId: string) {
  if (!gatewayId) {
    return { timeUpdate: DEFAULT_TIME_UPDATE_SECONDS, wifi: null as string | null, passWifi: null as string | null };
  }
  const rows = await queryRows<RowDataPacket>(
    `SELECT wifi_ssid, wifi_password, time_update_seconds
       FROM gateway_devices WHERE gateway_id = ? LIMIT 1`,
    [gatewayId],
  );
  const row = rows[0];
  return {
    timeUpdate: row ? asCount(row.time_update_seconds) || DEFAULT_TIME_UPDATE_SECONDS : DEFAULT_TIME_UPDATE_SECONDS,
    wifi: row?.wifi_ssid ? String(row.wifi_ssid) : null,
    passWifi: row?.wifi_password ? String(row.wifi_password) : null,
  };
}

async function insertAcceptedAlarms(
  connection: Awaited<ReturnType<typeof emsDb.getConnection>>,
  packet: NormalizedPacket,
  packetId: number,
  receivedAt: string,
) {
  const hasGatewayAlarm = packet.dateTimeAlarm != null || packet.idAlarm != null || packet.valueAlarm != null;
  if (hasGatewayAlarm) {
    await connection.execute(
      `INSERT INTO gateway_alarms (
        source, gateway_id, meter_model, meter_id, occurred_at, alarm_code, alarm_name,
        alarm_value, packet_id, created_at
      ) VALUES ('gateway', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        packet.gatewayId,
        packet.meterModel,
        packet.meterId,
        packet.dateTimeAlarm ?? packet.readingTime,
        packet.idAlarm,
        alarmName(packet.idAlarm),
        packet.valueAlarm,
        packetId,
        receivedAt,
      ],
    );
  }

  const [thresholdRows] = await connection.execute<RowDataPacket[]>(
    `SELECT gateway_id, meter_model, meter_id, parameter_name, min_value, max_value
       FROM gateway_thresholds
      WHERE (gateway_id = '' OR gateway_id = ?)
        AND (meter_model = '' OR meter_model = ?)
        AND (meter_id = '' OR meter_id = ?)`,
    [packet.gatewayId, packet.meterModel, packet.meterId],
  );

  const best = new Map<string, { score: number; row: ThresholdRow }>();
  for (const row of thresholdRows as ThresholdRow[]) {
    const score = (row.gateway_id ? 4 : 0) + (row.meter_id ? 2 : 0) + (row.meter_model ? 1 : 0);
    const current = best.get(row.parameter_name);
    if (!current || score > current.score) best.set(row.parameter_name, { score, row });
  }

  for (const { row } of best.values()) {
    const value = finiteNumber(packet.values[row.parameter_name]);
    if (value == null) continue;
    const min = finiteNumber(row.min_value);
    const max = finiteNumber(row.max_value);
    const below = min != null && value < min;
    const above = max != null && value > max;
    if (!below && !above) continue;
    await connection.execute(
      `INSERT INTO gateway_alarms (
        source, gateway_id, meter_model, meter_id, occurred_at, alarm_name,
        parameter_name, parameter_value, min_value, max_value, packet_id, created_at
      ) VALUES ('threshold', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        packet.gatewayId,
        packet.meterModel,
        packet.meterId,
        packet.readingTime,
        below ? "Thấp hơn Min" : "Cao hơn Max",
        row.parameter_name,
        value,
        min,
        max,
        packetId,
        receivedAt,
      ],
    );
  }
}

async function insertLog(input: {
  receivedAt: string;
  level: string;
  reason: string;
  gatewayId: string | null;
  meterModel: string | null;
  meterId: string | null;
  readingTime: string | null;
  packetNumber: string | null;
  rawText: string;
}) {
  await emsDb.execute(
    `INSERT INTO gateway_logs (
      received_at, level, reason, gateway_id, meter_model, meter_id, reading_time_raw, packet_number, raw_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.receivedAt,
      input.level,
      input.reason,
      input.gatewayId,
      input.meterModel,
      input.meterId,
      input.readingTime,
      input.packetNumber,
      input.rawText,
    ],
  );
}

function mapDevice(row: RowDataPacket): GatewayDeviceView {
  return {
    gatewayId: String(row.gateway_id),
    protocolVersion: textOrNull(row.protocol_version),
    internet: textOrNull(row.internet),
    temperature: textOrNull(row.gateway_temperature),
    humidity: textOrNull(row.gateway_humidity),
    packetNumber: textOrNull(row.packet_number),
    meterType: textOrNull(row.meter_type),
    meterModel: textOrNull(row.meter_model),
    meterId: textOrNull(row.meter_id),
    lastReadingTime: textOrNull(row.last_reading_time),
    lastIsReplay: row.last_is_replay == null ? null : Number(row.last_is_replay) === 1,
    lastError: row.last_error == null ? null : Number(row.last_error),
    lastValues: jsonField<Record<string, unknown> | null>(row.last_values, null),
    lastDisposition: textOrNull(row.last_disposition),
    lastSeenAt: textOrNull(row.last_seen_at),
    wifi: textOrNull(row.wifi_ssid),
    passWifi: textOrNull(row.wifi_password),
    timeUpdate: asCount(row.time_update_seconds) || DEFAULT_TIME_UPDATE_SECONDS,
  };
}

function mapPacket(row: RowDataPacket): GatewayPacketView {
  return {
    id: Number(row.id),
    receivedAt: String(row.received_at),
    disposition: String(row.disposition),
    protocolVersion: String(row.protocol_version),
    internet: String(row.internet),
    packetNumber: String(row.packet_number),
    gatewayId: String(row.gateway_id),
    gatewayTemperature: textOrNull(row.gateway_temperature),
    gatewayHumidity: textOrNull(row.gateway_humidity),
    meterType: String(row.meter_type),
    meterModel: String(row.meter_model),
    meterId: String(row.meter_id),
    readingTime: String(row.reading_time_raw),
    isReplay: Number(row.is_replay) === 1,
    error: Number(row.error_code),
    values: jsonField<Record<string, unknown>>(row.values_json, {}),
    dateTimeAlarm: textOrNull(row.date_time_alarm),
    idAlarm: row.id_alarm == null ? null : Number(row.id_alarm),
    valueAlarm: row.value_alarm == null ? null : Number(row.value_alarm),
    checksum: String(row.checksum),
    rawText: String(row.raw_text ?? ""),
  };
}

function mapAlarm(row: RowDataPacket): GatewayAlarmView {
  return {
    id: Number(row.id),
    source: row.source === "threshold" ? "threshold" : "gateway",
    gatewayId: String(row.gateway_id),
    meterModel: textOrNull(row.meter_model),
    meterId: textOrNull(row.meter_id),
    occurredAt: textOrNull(row.occurred_at),
    alarmCode: row.alarm_code == null ? null : Number(row.alarm_code),
    alarmName: textOrNull(row.alarm_name),
    alarmValue: row.alarm_value == null ? null : Number(row.alarm_value),
    parameterName: textOrNull(row.parameter_name),
    parameterValue: row.parameter_value == null ? null : Number(row.parameter_value),
    minValue: row.min_value == null ? null : Number(row.min_value),
    maxValue: row.max_value == null ? null : Number(row.max_value),
    packetId: row.packet_id == null ? null : Number(row.packet_id),
    createdAt: String(row.created_at),
  };
}

function mapLog(row: RowDataPacket): GatewayLogView {
  return {
    id: Number(row.id),
    receivedAt: String(row.received_at),
    level: String(row.level),
    reason: String(row.reason),
    gatewayId: textOrNull(row.gateway_id),
    meterModel: textOrNull(row.meter_model),
    meterId: textOrNull(row.meter_id),
    readingTime: textOrNull(row.reading_time_raw),
    packetNumber: textOrNull(row.packet_number),
    rawText: textOrNull(row.raw_text),
  };
}

function mapThreshold(row: RowDataPacket): GatewayThresholdView {
  return {
    id: Number(row.id),
    gatewayId: String(row.gateway_id ?? ""),
    meterModel: String(row.meter_model ?? ""),
    meterId: String(row.meter_id ?? ""),
    parameterName: String(row.parameter_name),
    minValue: row.min_value == null ? null : Number(row.min_value),
    maxValue: row.max_value == null ? null : Number(row.max_value),
  };
}

function collectParameters(values: Record<string, unknown> | null, target: Set<string>) {
  if (!values) return;
  for (const [key, value] of Object.entries(values)) {
    if (finiteNumber(value) != null) target.add(key);
  }
}

function textOrNull(value: unknown) {
  if (value == null) return null;
  const text = String(value);
  return text === "" ? null : text;
}

function asCount(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isDuplicate(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ER_DUP_ENTRY";
}

export type { PacketNumber };
