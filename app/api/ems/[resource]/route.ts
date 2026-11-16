import type { PoolConnection } from "mysql2/promise";
import { NextRequest } from "next/server";
import { normalizeAccountRole } from "@/lib/accounts";
import { getProjectsListTelemetry } from "@/lib/gateway-store";
import { hasPermission } from "@/lib/permissions";
import { getServerSession, requirePermission } from "@/lib/server-auth";
import { emsDb, jsonField, queryRows } from "@/lib/server-db";

function normalizeCustomerAccountRole(role: unknown): "Admin" | "View" | "Edit" {
  if (role === "Admin") return "Admin";
  if (role === "View" || role === "Viewer" || role === "Người xem" || role === "Chỉ xem") {
    return "View";
  }
  // Manage cũ / Edit → Xem và chỉnh sửa
  if (role === "Edit" || role === "Editor" || role === "Manage" || role === "Xem và chỉnh sửa") {
    return "Edit";
  }
  return "Edit";
}

function normalizeStaffAccountRole(role: unknown): "Admin" | "Manage" {
  return normalizeAccountRole(role);
}

type Params = { params: Promise<{ resource: string }> };
type Row = Record<string, any>;

const RESOURCE_NAMES = new Set([
  "accounts",
  "customer-accounts",
  "projects",
  "devices",
  "meter-types",
  "client-meters",
  "emission-factors",
  "ghg-sources",
  "alert-events",
  "meter-readings",
  "diagram-states",
  "project-settings",
  "project-telemetry",
]);

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

function forbidden(message = "Không có quyền thực hiện thao tác này.") {
  return Response.json({ error: message }, { status: 403 });
}

function serverError(error: unknown) {
  const sqlMessage =
    typeof error === "object" && error && "sqlMessage" in error
      ? String((error as { sqlMessage?: string }).sqlMessage ?? "")
      : "";
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
  const message = error instanceof Error ? error.message : "";
  console.error("EMS API error", { code, message, sqlMessage, error });
  if (code === "ER_DUP_ENTRY" || message.includes("uq_devices_serial_number")) {
    return Response.json({ error: "Serial này đã được dùng cho loại thiết bị khác." }, { status: 400 });
  }
  if (code === "ER_DATA_TOO_LONG" || message.includes("Data too long")) {
    return Response.json({ error: "Dữ liệu quá dài, không lưu được vào database." }, { status: 400 });
  }
  if (code === "ER_NO_REFERENCED_ROW_2" || code === "ER_NO_REFERENCED_ROW") {
    return Response.json({ error: "Mã dự án không tồn tại trên database, không lưu được cấu hình." }, { status: 400 });
  }
  if (code === "ER_ROW_IS_REFERENCED_2" || code === "ER_ROW_IS_REFERENCED") {
    return Response.json(
      { error: "Loại điểm đo đang được dự án sử dụng, không thể xóa." },
      { status: 400 },
    );
  }
  return Response.json({ error: "Không thể xử lý dữ liệu trên database." }, { status: 500 });
}

let deviceColumnsReady: Promise<void> | null = null;
let ghgColumnsReady: Promise<void> | null = null;
let projectSettingsReady: Promise<void> | null = null;
let customerAccountProjectsReady: Promise<void> | null = null;
let accountProjectsReady: Promise<void> | null = null;
let diagramDisplaysReady: Promise<void> | null = null;
let alertDeliveryColumnsReady: Promise<void> | null = null;
let alertRecipientChannelsReady: Promise<void> | null = null;
let emissionFactorGasColumnsReady: Promise<void> | null = null;

function ensureEmissionFactorGasColumns() {
  if (!emissionFactorGasColumnsReady) {
    emissionFactorGasColumnsReady = (async () => {
      await emsDb
        .query("ALTER TABLE emission_factor_gases MODIFY COLUMN gas_key VARCHAR(40) NOT NULL")
        .catch(() => undefined);
      await emsDb
        .query("ALTER TABLE emission_factor_gases MODIFY COLUMN gas_label VARCHAR(80) NOT NULL")
        .catch(() => undefined);
    })().catch((error) => {
      emissionFactorGasColumnsReady = null;
      console.error("emission factor gas columns migrate failed", error);
      throw error;
    });
  }
  return emissionFactorGasColumnsReady;
}

function normalizeAlertDeliveryStatus(value: unknown, allowNull = false) {
  if (value === "sent" || value === "failed" || value === "pending") return value;
  return allowNull ? null : "pending";
}

const ALERT_CHANNELS = new Set(["email", "zalo", "telegram", "sms"]);

function normalizeRecipientChannels(value: unknown, fallbackEmail?: string, fallbackPhone?: string) {
  if (Array.isArray(value)) {
    const next = Array.from(
      new Set(
        value.filter((item): item is string => typeof item === "string" && ALERT_CHANNELS.has(item)),
      ),
    );
    if (next.length) return next;
  }
  const fallback: string[] = [];
  if (fallbackEmail) fallback.push("email");
  if (fallbackPhone) fallback.push("sms");
  return fallback.length ? fallback : ["email"];
}

function ensureAlertDeliveryColumns() {
  if (!alertDeliveryColumnsReady) {
    alertDeliveryColumnsReady = (async () => {
      await emsDb
        .query(
          `ALTER TABLE alert_events
             ADD COLUMN IF NOT EXISTS email_status VARCHAR(20) NULL AFTER acknowledged_at`,
        )
        .catch(() => undefined);
      await emsDb
        .query(
          `ALTER TABLE alert_events
             ADD COLUMN IF NOT EXISTS zalo_status VARCHAR(20) NULL AFTER email_status`,
        )
        .catch(() => undefined);
      await emsDb
        .query(
          `ALTER TABLE alert_events
             ADD COLUMN IF NOT EXISTS telegram_status VARCHAR(20) NULL AFTER zalo_status`,
        )
        .catch(() => undefined);
    })().catch((error) => {
      alertDeliveryColumnsReady = null;
      console.error("alert delivery columns migrate failed", error);
      throw error;
    });
  }
  return alertDeliveryColumnsReady;
}

function ensureAlertRecipientChannels() {
  if (!alertRecipientChannelsReady) {
    alertRecipientChannelsReady = emsDb
      .query(
        `ALTER TABLE alert_recipients
           ADD COLUMN IF NOT EXISTS channels JSON NULL AFTER phone`,
      )
      .then(() => undefined)
      .catch((error) => {
        alertRecipientChannelsReady = null;
        console.error("alert recipient channels migrate failed", error);
        throw error;
      });
  }
  return alertRecipientChannelsReady;
}

function ensureAccountProjects() {
  if (!accountProjectsReady) {
    accountProjectsReady = migrateAccountProjects().catch((error) => {
      accountProjectsReady = null;
      console.error("account_projects migrate failed", error);
      throw error;
    });
  }
  return accountProjectsReady;
}

async function migrateAccountProjects() {
  await emsDb.query(
    `CREATE TABLE IF NOT EXISTS account_projects (
       account_id VARCHAR(64) NOT NULL,
       project_id VARCHAR(64) NOT NULL,
       PRIMARY KEY (account_id, project_id),
       KEY idx_account_projects_project (project_id),
       CONSTRAINT fk_account_projects_account
         FOREIGN KEY (account_id) REFERENCES accounts (id)
         ON DELETE CASCADE ON UPDATE CASCADE,
       CONSTRAINT fk_account_projects_project
         FOREIGN KEY (project_id) REFERENCES projects (id)
         ON DELETE CASCADE ON UPDATE CASCADE
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  // Chuẩn hóa role cũ → Admin | Manage
  await emsDb
    .execute(`UPDATE accounts SET role = 'Admin' WHERE role IN ('Admin', 'Quản trị viên')`)
    .catch(() => undefined);
  await emsDb
    .execute(
      `UPDATE accounts SET role = 'Manage'
        WHERE role NOT IN ('Admin', 'Quản trị viên')`,
    )
    .catch(() => undefined);
}

function ensureDiagramDisplaysColumn() {
  if (!diagramDisplaysReady) {
    diagramDisplaysReady = emsDb
      .query(
        `ALTER TABLE diagram_states
           ADD COLUMN IF NOT EXISTS displays JSON NULL AFTER viewport`,
      )
      .then(() => undefined)
      .catch((error) => {
        diagramDisplaysReady = null;
        // Cột có thể đã tồn tại trên MariaDB cũ không hỗ trợ IF NOT EXISTS.
        console.error("diagram_states.displays migrate failed", error);
        return undefined;
      });
  }
  return diagramDisplaysReady;
}

function ensureCustomerAccountProjects() {
  if (!customerAccountProjectsReady) {
    customerAccountProjectsReady = migrateCustomerAccountProjects().catch((error) => {
      customerAccountProjectsReady = null;
      console.error("customer_account_projects migrate failed", error);
      throw error;
    });
  }
  return customerAccountProjectsReady;
}

async function migrateCustomerAccountProjects() {
  await emsDb.query(
    `CREATE TABLE IF NOT EXISTS customer_account_projects (
       account_id VARCHAR(64) NOT NULL,
       project_id VARCHAR(64) NOT NULL,
       PRIMARY KEY (account_id, project_id),
       KEY idx_customer_account_projects_project (project_id),
       CONSTRAINT fk_customer_account_projects_account
         FOREIGN KEY (account_id) REFERENCES customer_accounts (id)
         ON DELETE CASCADE ON UPDATE CASCADE,
       CONSTRAINT fk_customer_account_projects_project
         FOREIGN KEY (project_id) REFERENCES projects (id)
         ON DELETE CASCADE ON UPDATE CASCADE
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  await emsDb.query("ALTER TABLE customer_accounts DROP INDEX uq_customer_accounts_project").catch(() => undefined);
  await emsDb
    .query(
      `ALTER TABLE customer_accounts
         ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'Manage' AFTER display_name`,
    )
    .catch(() => undefined);
  await emsDb.query(
    `INSERT IGNORE INTO customer_account_projects (account_id, project_id)
     SELECT id, project_id FROM customer_accounts WHERE project_id IS NOT NULL AND project_id <> ''`,
  );
}

function ensureDeviceColumns() {
  deviceColumnsReady ??= emsDb
    .execute("ALTER TABLE devices MODIFY COLUMN image MEDIUMTEXT NULL")
    .then(() => undefined);
  return deviceColumnsReady;
}

function ensureProjectSettingsTable() {
  if (!projectSettingsReady) {
    projectSettingsReady = migrateProjectSettings().catch((error) => {
      projectSettingsReady = null;
      console.error("project_settings migrate failed", error);
      throw error;
    });
  }
  return projectSettingsReady;
}

async function migrateProjectSettings() {
  await emsDb.query(
    `CREATE TABLE IF NOT EXISTS project_settings (
       project_id VARCHAR(64) NOT NULL,
       payload JSON NOT NULL,
       updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       PRIMARY KEY (project_id)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  await emsDb
    .query(
      `ALTER TABLE project_settings
         ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
    )
    .catch(() => undefined);
  await emsDb.query("ALTER TABLE project_settings ADD PRIMARY KEY (project_id)").catch(() => undefined);
}

function ensureGhgColumns() {
  ghgColumnsReady ??= Promise.all([
    emsDb.execute(
      "ALTER TABLE ghg_emission_sources ADD COLUMN IF NOT EXISTS multipliers_json JSON NULL",
    ),
    emsDb.execute(
      "ALTER TABLE ghg_emission_sources ADD COLUMN IF NOT EXISTS manual_value DECIMAL(18,6) NULL",
    ),
    emsDb.execute(
      "ALTER TABLE ghg_emission_sources ADD COLUMN IF NOT EXISTS manual_unit VARCHAR(40) NULL",
    ),
    emsDb
      .execute("ALTER TABLE ghg_emission_sources DROP FOREIGN KEY fk_ghg_sources_factor")
      .catch(() => undefined),
    emsDb
      .execute("ALTER TABLE ghg_emission_sources MODIFY COLUMN factor_group_id VARCHAR(100) NULL")
      .catch(() => undefined),
    emsDb
      .execute("ALTER TABLE ghg_emission_sources MODIFY COLUMN gas_key VARCHAR(10) NULL")
      .catch(() => undefined),
  ]).then(() => undefined);
  return ghgColumnsReady;
}

function asMultipliers(value: unknown) {
  const rows = jsonField<Row[]>(value, []);
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row, index) => ({
      id: asString(row.id) || `mul-${index + 1}`,
      label: asString(row.label).trim(),
      symbol: asString(row.symbol).trim(),
      value: asNumber(row.value),
      unit: asString(row.unit).trim(),
    }))
    .filter((row) => row.label || row.symbol);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function recipientKey(value: unknown) {
  const id = asString(value).trim();
  if (id && id !== "rcpt-new") return id;
  return `rcpt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function projectDateForDb(value: unknown) {
  const input = asString(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const match = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function asNumber(value: unknown, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

async function resourceName(context: Params) {
  const { resource } = await context.params;
  return resource;
}

async function getProjects(projectId?: string) {
  const where = projectId ? "WHERE p.id = ?" : "";
  const params = projectId ? [projectId] : [];
  const projects = await queryRows<Row>(
    `SELECT p.id, p.initials, p.accent, p.name, p.customer, p.status,
            DATE_FORMAT(p.start_date, '%Y-%m-%d') AS startDate,
            p.contact_name AS contactName, p.phone, p.email, p.address,
            p.logo_url AS logoUrl
       FROM projects p ${where}
      ORDER BY p.id DESC`,
    params,
  );
  if (!projects.length) return [];

  const ids = projects.map((project) => project.id as string);
  const placeholders = ids.map(() => "?").join(",");
  const types = await queryRows<Row>(
    `SELECT project_id AS projectId, meter_type_name AS meterType
       FROM project_meter_types WHERE project_id IN (${placeholders})
      ORDER BY project_id, meter_type_name`,
    ids,
  );
  await ensureAlertRecipientChannels();
  const recipients = await queryRows<Row>(
    `SELECT id, project_id AS projectId, name, email, phone, channels
       FROM alert_recipients WHERE project_id IN (${placeholders})
      ORDER BY project_id, id`,
    ids,
  );
  const typesByProject = new Map<string, string[]>();
  const recipientsByProject = new Map<string, Row[]>();
  for (const row of types) {
    const id = row.projectId as string;
    typesByProject.set(id, [...(typesByProject.get(id) ?? []), row.meterType as string]);
  }
  for (const row of recipients) {
    const id = row.projectId as string;
    const email = asString(row.email);
    const phone = asString(row.phone);
    recipientsByProject.set(id, [...(recipientsByProject.get(id) ?? []), {
      id: row.id,
      name: row.name,
      email,
      phone,
      channels: normalizeRecipientChannels(jsonField(row.channels, null), email, phone),
    }]);
  }
  return projects.map((project) => ({
    ...project,
    meterTypes: typesByProject.get(project.id as string) ?? [],
    recipients: recipientsByProject.get(project.id as string) ?? [],
  }));
}

async function getResource(resource: string, request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId") || undefined;
  if (resource === "accounts") {
    await ensureAccountProjects();
    const accounts = await queryRows<Row>(
      `SELECT id, username, email, role, DATE_FORMAT(created_at, '%d/%m/%Y') AS createdAt
         FROM accounts ORDER BY created_at DESC, id`,
    );
    if (!accounts.length) return [];
    const links = await queryRows<{ accountId: string; projectId: string }>(
      `SELECT account_id AS accountId, project_id AS projectId FROM account_projects`,
    );
    const byAccount = new Map<string, string[]>();
    for (const link of links) {
      const list = byAccount.get(String(link.accountId)) ?? [];
      list.push(String(link.projectId));
      byAccount.set(String(link.accountId), list);
    }
    return accounts.map((account) => {
      const role = normalizeStaffAccountRole(account.role);
      const projectIds = role === "Admin" ? [] : (byAccount.get(String(account.id)) ?? []);
      return { ...account, role, projectIds };
    });
  }
  if (resource === "customer-accounts") {
    await ensureCustomerAccountProjects();
    const accounts = await queryRows<Row>(
      `SELECT id, username, email, display_name AS displayName,
              COALESCE(role, 'Manage') AS role, project_id AS projectId
         FROM customer_accounts
        ORDER BY id`,
    );
    if (!accounts.length) return [];
    const links = await queryRows<{ accountId: string; projectId: string }>(
      `SELECT account_id AS accountId, project_id AS projectId
         FROM customer_account_projects`,
    );
    const byAccount = new Map<string, string[]>();
    for (const link of links) {
      const list = byAccount.get(String(link.accountId)) ?? [];
      list.push(String(link.projectId));
      byAccount.set(String(link.accountId), list);
    }
    const mapped = accounts.map((account) => {
      const id = String(account.id);
      const role = normalizeCustomerAccountRole(account.role);
      const primary = String(account.projectId ?? "");
      const fromLinks = byAccount.get(id) ?? [];
      const projectIds = Array.from(new Set([primary, ...fromLinks].filter(Boolean)));
      return {
        ...account,
        role,
        projectId: projectIds.includes(primary) ? primary : (projectIds[0] ?? primary),
        projectIds,
      };
    });
    if (!projectId) return mapped;
    return mapped.filter((account) => {
      if (account.role === "Admin") return true;
      return (
        Array.isArray(account.projectIds) &&
        (account.projectIds as string[]).includes(projectId)
      );
    });
  }
  if (resource === "projects") {
    const projects = (await getProjects(projectId)) as Row[];
    const session = await getServerSession();
    if (
      session?.portal === "admin" &&
      normalizeStaffAccountRole(session.role) === "Manage"
    ) {
      await ensureAccountProjects();
      const allowed = new Set(session.projectIds ?? []);
      if (!allowed.size && session.userId) {
        const links = await queryRows<{ projectId: string }>(
          `SELECT project_id AS projectId FROM account_projects WHERE account_id = ?`,
          [session.userId],
        );
        for (const link of links) allowed.add(String(link.projectId));
      }
      return projects.filter((project) => allowed.has(String(project.id)));
    }
    return projects;
  }
  if (resource === "project-telemetry") return getProjectsListTelemetry();
  if (resource === "devices") {
    await ensureDeviceColumns();
    const rows = await queryRows<Row>(
      `SELECT id, name, serial_number AS sn, brand_model AS brandModel, brand,
              device_type AS type, category, kind, status, last_sync_label AS lastSync,
              protocol, notes, image, extra_fields AS extraFields, registers
         FROM devices ORDER BY id`,
    );
    return rows.map((row) => ({
      ...row,
      extraFields: jsonField(row.extraFields, undefined),
      registers: jsonField(row.registers, undefined),
    }));
  }
  if (resource === "meter-types") {
    return queryRows<Row>("SELECT name, description, icon, builtin FROM meter_types ORDER BY builtin DESC, name");
  }
  if (resource === "client-meters") {
    if (!projectId) throw new Error("projectId is required");
    return queryRows<Row>(
      `SELECT id, name, code, device_type AS type, parent_id AS parentId,
              utility, device_id AS deviceId, serial_number AS serialNumber
         FROM meter_points WHERE project_id = ? ORDER BY id`,
      [projectId],
    );
  }
  if (resource === "emission-factors") {
    await ensureEmissionFactorGasColumns();
    const groups = await queryRows<Row>(
      "SELECT id, name, source FROM emission_factor_groups ORDER BY id",
    );
    const gases = await queryRows<Row>(
      `SELECT group_id AS groupId, gas_key AS gasKey, gas_label AS gasLabel,
              factor_value AS value, unit
         FROM emission_factor_gases ORDER BY group_id, gas_key`,
    );
    return groups.map((group) => ({
      ...group,
      gases: gases
        .filter((gas) => gas.groupId === group.id)
        .map((gas) => ({
          key: asString(gas.gasKey),
          label: asString(gas.gasLabel),
          value: asNumber(gas.value),
          unit: asString(gas.unit),
        })),
    }));
  }
  if (resource === "ghg-sources") {
    await ensureGhgColumns();
    const rows = await queryRows<Row>(
      `SELECT id, project_id AS projectId, scope_id AS scope, name,
              meter_point_id AS meterPointId,
              input_method AS method, factor_group_id AS factorGroupId,
              gas_key AS gasKey, factor_value AS factorValue, formula,
              multipliers_json AS multipliers,
              manual_value AS manualValue, manual_unit AS manualUnit,
              DATE_FORMAT(applied_at, '%Y-%m-%d') AS appliedAt,
              tons_co2e AS tons
         FROM ghg_emission_sources ${projectId ? "WHERE project_id = ?" : ""}
        ORDER BY scope, id`,
      projectId ? [projectId] : [],
    );
    return rows.map((row) => ({
      ...row,
      scope: asNumber(row.scope),
      factorId:
        row.factorGroupId && row.gasKey
          ? `${row.factorGroupId}:${row.gasKey}`
          : "none:none",
      factorValue: asNumber(row.factorValue),
      multipliers: asMultipliers(row.multipliers),
      manualValue: row.manualValue == null ? undefined : asNumber(row.manualValue),
      manualUnit: asString(row.manualUnit) || undefined,
      tons: row.tons == null ? undefined : asNumber(row.tons),
    }));
  }
  if (resource === "alert-events") {
    await ensureAlertDeliveryColumns();
    const rows = await queryRows<Row>(
      `SELECT a.id, a.project_id AS projectId, a.meter_point_id AS meterPointId,
              DATE_FORMAT(a.occurred_at, '%Y-%m-%d %H:%i:%s') AS occurredAt,
              a.parameter_name AS parameter, a.value, a.unit, a.severity, a.status, a.note,
              a.category, a.message, a.threshold_value AS thresholdValue,
              a.acknowledged_by AS acknowledgedBy,
              DATE_FORMAT(a.acknowledged_at, '%Y-%m-%d %H:%i:%s') AS acknowledgedAt,
              a.email_status AS emailStatus,
              a.zalo_status AS zaloStatus,
              a.telegram_status AS telegramStatus,
              p.code AS pointCode, p.name AS pointName, p.utility
         FROM alert_events a
         LEFT JOIN meter_points p ON p.id = a.meter_point_id
        ${projectId ? "WHERE a.project_id = ?" : ""}
        ORDER BY occurred_at DESC`,
      projectId ? [projectId] : [],
    );
    return rows.map((row) => {
      const emailStatus = normalizeAlertDeliveryStatus(row.emailStatus);
      const zaloStatus = normalizeAlertDeliveryStatus(row.zaloStatus);
      const telegramStatus = normalizeAlertDeliveryStatus(row.telegramStatus);
      return {
        ...row,
        value: asNumber(row.value),
        thresholdValue: row.thresholdValue == null ? undefined : asNumber(row.thresholdValue),
        emailStatus,
        zaloStatus,
        telegramStatus,
        delivery: { email: emailStatus, zalo: zaloStatus, telegram: telegramStatus },
      };
    });
  }
  if (resource === "meter-readings") {
    const meterPointId = request.nextUrl.searchParams.get("meterPointId") || undefined;
    const metric = request.nextUrl.searchParams.get("metric") || undefined;
    if (!projectId && !meterPointId) throw new Error("projectId or meterPointId is required");
    const filters = [
      projectId ? "m.project_id = ?" : "",
      meterPointId ? "r.meter_point_id = ?" : "",
      metric ? "r.metric = ?" : "",
    ].filter(Boolean);
    const params = [projectId, meterPointId, metric].filter((item): item is string => Boolean(item));
    const rows = await queryRows<Row>(
      `SELECT r.id, r.meter_point_id AS meterPointId,
              DATE_FORMAT(r.recorded_at, '%Y-%m-%d %H:%i:%s') AS recordedAt,
              r.metric, r.value, r.unit, r.quality,
              m.code, m.name, m.utility
         FROM meter_readings r
         JOIN meter_points m ON m.id = r.meter_point_id
        WHERE ${filters.join(" AND ")}
        ORDER BY r.recorded_at ASC, r.id ASC`,
      params,
    );
    return rows.map((row) => ({ ...row, value: asNumber(row.value) }));
  }
  if (resource === "diagram-states") {
    if (!projectId) throw new Error("projectId is required");
    await ensureDiagramDisplaysColumn();
    const utility = request.nextUrl.searchParams.get("utility");
    const rows = await queryRows<Row>(
      `SELECT project_id AS projectId, utility, positions, viewport, displays, updated_at AS updatedAt
         FROM diagram_states WHERE project_id = ? ${utility ? "AND utility = ?" : ""}
        ORDER BY utility`,
      utility ? [projectId, utility] : [projectId],
    );
    return rows.map((row) => ({
      ...row,
      positions: jsonField(row.positions, {}),
      viewport: jsonField(row.viewport, undefined),
      displays: jsonField(row.displays, {}),
    }));
  }
  if (resource === "project-settings") {
    if (!projectId) throw new Error("projectId is required");
    await ensureProjectSettingsTable();
    const rows = await queryRows<Row>(
      `SELECT project_id AS projectId, payload, updated_at AS updatedAt
         FROM project_settings WHERE project_id = ?
         ORDER BY updated_at DESC LIMIT 1`,
      [projectId],
    );
    if (!rows[0]) return [];
    return [{
      projectId: rows[0].projectId,
      payload: jsonField(rows[0].payload, {}),
      updatedAt: rows[0].updatedAt,
    }];
  }
  throw new Error(`Unknown resource: ${resource}`);
}

async function transaction<T>(work: (connection: PoolConnection) => Promise<T>) {
  const connection = await emsDb.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function saveResource(resource: string, body: Row) {
  if (resource === "accounts") {
    await ensureAccountProjects();
    const session = await getServerSession();
    if (!session || session.portal !== "admin") {
      throw new Error("Cần đăng nhập cổng quản trị.");
    }
    const isAdminActor = hasPermission(session, "manageUsers");
    const items = Array.isArray(body.items) ? body.items : [body];
    if (Array.isArray(body.items) && !isAdminActor) {
      throw new Error("Chỉ Admin được cập nhật hàng loạt tài khoản.");
    }
    for (const item of items as Row[]) {
      const accountId = asString(item.id).trim();
      if (!accountId) throw new Error("Thiếu mã tài khoản.");
      const isSelf = session.userId === accountId;
      if (!isAdminActor && !isSelf) {
        throw new Error("Không có quyền sửa tài khoản này.");
      }

      const existingRows = await queryRows<{
        role: string;
        username: string;
        email: string;
      }>("SELECT role, username, email FROM accounts WHERE id = ? LIMIT 1", [accountId]);
      const existing = existingRows[0];
      const isCreate = !existing;
      if (isCreate && !isAdminActor) {
        throw new Error("Chỉ Admin được tạo tài khoản nội bộ.");
      }

      // Không tự phân quyền cho mình; chỉ cấp trên (Admin) gán quyền cấp dưới.
      let role = normalizeStaffAccountRole(item.role);
      if (isSelf || !isAdminActor) {
        role = existing ? normalizeStaffAccountRole(existing.role) : role;
      }

      let projectIds =
        role === "Admin"
          ? []
          : Array.from(
              new Set(
                (Array.isArray(item.projectIds) ? item.projectIds.map(String) : [])
                  .map((id) => id.trim())
                  .filter(Boolean),
              ),
            );
      if (isSelf || !isAdminActor) {
        const links = await queryRows<{ projectId: string }>(
          "SELECT project_id AS projectId FROM account_projects WHERE account_id = ?",
          [accountId],
        );
        projectIds =
          role === "Admin" ? [] : links.map((row) => String(row.projectId)).filter(Boolean);
      }
      if (role === "Manage" && !projectIds.length) {
        throw new Error("Manage nội bộ cần chọn ít nhất một dự án được gán quyền.");
      }

      const password = asString(item.password);
      const currentPassword = asString(item.currentPassword);
      if (password && isSelf) {
        if (!currentPassword) {
          throw new Error("Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu.");
        }
        const matched = await queryRows<{ id: string }>(
          `SELECT id FROM accounts
            WHERE id = ? AND password_hash = SHA2(?, 256)
            LIMIT 1`,
          [accountId, currentPassword],
        );
        if (!matched.length) {
          throw new Error("Mật khẩu hiện tại không đúng.");
        }
      }
      if (isCreate && !password) {
        throw new Error("Vui lòng nhập mật khẩu cho tài khoản mới.");
      }

      const username = asString(item.username).trim() || asString(existing?.username);
      const email = asString(item.email).trim() || asString(existing?.email);
      const createdAt = asString(item.createdAt) || new Date().toLocaleDateString("en-GB");

      await transaction(async (connection) => {
        await connection.execute(
          `INSERT INTO accounts (id, username, email, role, password_hash, created_at)
           VALUES (?, ?, ?, ?, SHA2(?, 256), STR_TO_DATE(?, '%d/%m/%Y'))
           ON DUPLICATE KEY UPDATE username=VALUES(username), email=VALUES(email),
             role=VALUES(role), created_at=VALUES(created_at),
             password_hash=IF(? = '', password_hash, SHA2(?, 256))`,
          [
            accountId,
            username,
            email,
            role,
            password || "123456",
            createdAt,
            password,
            password,
          ],
        );
        await connection.execute("DELETE FROM account_projects WHERE account_id = ?", [accountId]);
        for (const projectId of projectIds) {
          await connection.execute(
            "INSERT INTO account_projects (account_id, project_id) VALUES (?, ?)",
            [accountId, projectId],
          );
        }
      });
    }
    return getResource(resource, new NextRequest("http://localhost/api/ems/accounts"));
  }
  if (resource === "customer-accounts") {
    await ensureCustomerAccountProjects();
    const password = asString(body.password, "123456");
    const role = normalizeCustomerAccountRole(body.role ?? "Edit");
    const projectIds = Array.from(
      new Set(
        [
          ...(Array.isArray(body.projectIds) ? body.projectIds.map(String) : []),
          asString(body.projectId, ""),
        ]
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
    if (role !== "Admin" && !projectIds.length) throw new Error("projectIds is required");
    let primary = projectIds.includes(asString(body.projectId, ""))
      ? asString(body.projectId, projectIds[0] ?? "")
      : (projectIds[0] ?? "");
    if (!primary) {
      const firstProject = await queryRows<{ id: string }>("SELECT id FROM projects ORDER BY id LIMIT 1");
      primary = String(firstProject[0]?.id ?? "");
    }
    if (!primary) throw new Error("projectId is required");
    await transaction(async (connection) => {
      await connection.execute(
        `INSERT INTO customer_accounts (id, username, email, display_name, role, project_id, password_hash)
         VALUES (?, ?, ?, ?, ?, ?, SHA2(?, 256))
         ON DUPLICATE KEY UPDATE username=VALUES(username), email=VALUES(email),
           display_name=VALUES(display_name), role=VALUES(role), project_id=VALUES(project_id),
           password_hash=IF(? = '', password_hash, SHA2(?, 256))`,
        [body.id, body.username, body.email, body.displayName, role, primary, password, password, password],
      );
      await connection.execute("DELETE FROM customer_account_projects WHERE account_id = ?", [body.id]);
      for (const linkedProjectId of projectIds) {
        await connection.execute(
          "INSERT INTO customer_account_projects (account_id, project_id) VALUES (?, ?)",
          [body.id, linkedProjectId],
        );
      }
    });
    return getResource(resource, new NextRequest("http://localhost/api/ems/customer-accounts"));
  }
  if (resource === "projects") {
    if (Array.isArray(body.items)) {
      for (const item of body.items as Row[]) await saveResource(resource, item);
      return getProjects();
    }
    const meterTypes = Array.isArray(body.meterTypes) ? body.meterTypes.filter(Boolean) as string[] : [];
    const recipients = Array.isArray(body.recipients) ? body.recipients as Row[] : [];
    const startDate = projectDateForDb(body.startDate);
    if (!startDate) throw new Error("startDate must use YYYY-MM-DD or DD/MM/YYYY format");
    await ensureAlertRecipientChannels();
    await transaction(async (connection) => {
      await connection.execute(
        `INSERT INTO projects (id, initials, accent, name, customer, status, start_date,
           contact_name, phone, email, address, logo_url)
         VALUES (?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%d'),
           ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE initials=VALUES(initials), accent=VALUES(accent),
           name=VALUES(name), customer=VALUES(customer), status=VALUES(status),
           start_date=VALUES(start_date), contact_name=VALUES(contact_name),
           phone=VALUES(phone), email=VALUES(email), address=VALUES(address),
           logo_url=VALUES(logo_url)`,
        [body.id, body.initials, body.accent, body.name, body.customer, body.status,
          startDate, body.contactName || null, body.phone || null,
          body.email || null, body.address || null, body.logoUrl || null],
      );
      await connection.execute("DELETE FROM project_meter_types WHERE project_id = ?", [body.id]);
      for (const meterType of meterTypes) {
        await connection.execute(
          `INSERT IGNORE INTO meter_types (name, description, icon, builtin)
           VALUES (?, 'Loại điểm đo tùy chỉnh', 'generic', 0)`,
          [meterType],
        );
        await connection.execute(
          "INSERT IGNORE INTO project_meter_types (project_id, meter_type_name) VALUES (?, ?)",
          [body.id, meterType],
        );
      }
      await connection.execute("DELETE FROM alert_recipients WHERE project_id = ?", [body.id]);
      for (const recipient of recipients) {
        if (!recipient.name && !recipient.email && !recipient.phone) continue;
        const email = asString(recipient.email);
        const phone = asString(recipient.phone);
        const channels = normalizeRecipientChannels(recipient.channels, email, phone);
        await connection.execute(
          `INSERT INTO alert_recipients (id, project_id, name, email, phone, channels)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            recipientKey(recipient.id),
            body.id,
            recipient.name || "",
            email,
            phone,
            JSON.stringify(channels),
          ],
        );
      }
    });
    // Manage nội bộ tạo dự án mới → tự gán vào phạm vi của họ
    const session = await getServerSession();
    if (
      session?.portal === "admin" &&
      normalizeStaffAccountRole(session.role) === "Manage" &&
      session.userId &&
      body.id
    ) {
      await ensureAccountProjects();
      await emsDb
        .execute("INSERT IGNORE INTO account_projects (account_id, project_id) VALUES (?, ?)", [
          session.userId,
          body.id,
        ])
        .catch(() => undefined);
    }
    return getProjects(asString(body.id));
  }
  if (resource === "devices") {
    await ensureDeviceColumns();
    if (Array.isArray(body.items)) {
      for (const item of body.items as Row[]) await saveResource(resource, item);
      return getResource(resource, new NextRequest("http://localhost/api/ems/devices"));
    }
    await emsDb.execute(
      `INSERT INTO devices
        (id, name, serial_number, brand_model, brand, device_type, category, kind, status,
         last_sync_label, protocol, notes, image, extra_fields, registers)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), serial_number=VALUES(serial_number),
         brand_model=VALUES(brand_model), brand=VALUES(brand), device_type=VALUES(device_type),
         category=VALUES(category), kind=VALUES(kind), status=VALUES(status),
         last_sync_label=VALUES(last_sync_label), protocol=VALUES(protocol), notes=VALUES(notes),
         image=VALUES(image), extra_fields=VALUES(extra_fields), registers=VALUES(registers)`,
      [body.id, body.name, body.sn, body.brandModel, body.brand, body.type, body.category || null,
        body.kind, body.status, body.lastSync, body.protocol || null, body.notes || null,
        body.image || null,
        body.extraFields ? JSON.stringify(body.extraFields) : null,
        body.registers ? JSON.stringify(body.registers) : null],
    );
    return getResource(resource, new NextRequest("http://localhost/api/ems/devices"));
  }
  if (resource === "meter-types") {
    const previousName = asString(body.previousName);
    const name = asString(body.name).trim();
    if (!name) throw new Error("Tên loại điểm đo không được để trống.");
    await transaction(async (connection) => {
      if (previousName && previousName !== name) {
        const existing = await queryRows<{ builtin: number }>(
          "SELECT builtin FROM meter_types WHERE name = ? LIMIT 1",
          [previousName],
        );
        if (existing[0]?.builtin) {
          throw new Error("Không thể đổi tên loại điểm đo mặc định.");
        }
        await connection.execute(
          `INSERT INTO meter_types (name, description, icon, builtin)
           SELECT ?, ?, ?, builtin FROM meter_types WHERE name = ?
           ON DUPLICATE KEY UPDATE description=VALUES(description), icon=VALUES(icon)`,
          [name, body.description || "Loại điểm đo tùy chỉnh", body.icon || "generic", previousName],
        );
        await connection.execute(
          "UPDATE project_meter_types SET meter_type_name = ? WHERE meter_type_name = ?",
          [name, previousName],
        );
        await connection.execute("DELETE FROM meter_types WHERE name = ? AND builtin = 0", [previousName]);
      } else {
        await connection.execute(
          `INSERT INTO meter_types (name, description, icon, builtin) VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE description=VALUES(description), icon=VALUES(icon)`,
          [name, body.description || "Loại điểm đo tùy chỉnh", body.icon || "generic", body.builtin ? 1 : 0],
        );
      }
    });
    return getResource(resource, new NextRequest("http://localhost/api/ems/meter-types"));
  }
  if (resource === "client-meters") {
    const projectId = asString(body.projectId);
    const meters = Array.isArray(body.meters) ? body.meters as Row[] : [];
    if (!projectId) throw new Error("projectId is required");
    await transaction(async (connection) => {
      await connection.execute("DELETE FROM meter_points WHERE project_id = ?", [projectId]);
      const parents = meters.filter((meter) => !meter.parentId);
      const children = meters.filter((meter) => meter.parentId);
      for (const meter of [...parents, ...children]) {
        await connection.execute(
          `INSERT INTO meter_points
             (id, project_id, name, code, device_type, parent_id, utility, device_id, serial_number)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [meter.id, projectId, meter.name, meter.code, meter.type, meter.parentId || null,
            meter.utility, meter.deviceId || null, meter.serialNumber || null],
        );
      }
    });
    return getResource(resource, new NextRequest(`http://localhost/api/ems/client-meters?projectId=${encodeURIComponent(projectId)}`));
  }
  if (resource === "emission-factors") {
    await ensureEmissionFactorGasColumns();
    const group = body;
    const gases = Array.isArray(group.gases) ? group.gases as Row[] : [];
    await transaction(async (connection) => {
      await connection.execute(
        `INSERT INTO emission_factor_groups (id, name, source) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), source=VALUES(source)`,
        [group.id, group.name, group.source || ""],
      );
      await connection.execute("DELETE FROM emission_factor_gases WHERE group_id = ?", [group.id]);
      for (const gas of gases) {
        const key = asString(gas.key).trim().slice(0, 40) || "gas";
        const label = asString(gas.label).trim().slice(0, 80) || key;
        await connection.execute(
          `INSERT INTO emission_factor_gases (group_id, gas_key, gas_label, factor_value, unit)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE gas_label=VALUES(gas_label), factor_value=VALUES(factor_value), unit=VALUES(unit)`,
          [group.id, key, label, asNumber(gas.value), gas.unit || ""],
        );
      }
    });
    return getResource(resource, new NextRequest("http://localhost/api/ems/emission-factors"));
  }
  if (resource === "ghg-sources") {
    await ensureGhgColumns();
    const projectId = asString(body.projectId);
    const sources = Array.isArray(body.sources) ? body.sources as Row[] : [];
    if (!projectId) throw new Error("projectId is required");
    await transaction(async (connection) => {
      await connection.execute("DELETE FROM ghg_emission_sources WHERE project_id = ?", [projectId]);
      for (const source of sources) {
        const factorId = asString(source.factorId);
        const [rawGroupId, rawGasKey] = factorId.split(":");
        const factorGroupId =
          !rawGroupId || rawGroupId === "none" ? null : rawGroupId;
        const gasKey = !rawGasKey || rawGasKey === "none" ? null : rawGasKey;
        const multipliers = asMultipliers(source.multipliers);
        await connection.execute(
          `INSERT INTO ghg_emission_sources
            (id, project_id, scope_id, name, input_method, factor_group_id, gas_key,
             factor_value, formula, multipliers_json, applied_at, meter_point_id,
             manual_value, manual_unit, tons_co2e)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [source.id, projectId, asNumber(source.scope), source.name, source.method,
            factorGroupId, gasKey, asNumber(source.factorValue),
            source.formula || "", multipliers.length ? JSON.stringify(multipliers) : null,
            source.appliedAt, asString(source.meterPointId) || null,
            source.manualValue == null ? null : asNumber(source.manualValue),
            asString(source.manualUnit) || null,
            source.tons == null ? null : asNumber(source.tons)],
        );
      }
    });
    return getResource(resource, new NextRequest(`http://localhost/api/ems/ghg-sources?projectId=${encodeURIComponent(projectId)}`));
  }
  if (resource === "alert-events") {
    await ensureAlertDeliveryColumns();
    const id = asString(body.id);
    const projectId = asString(body.projectId);
    if (!id || !projectId) throw new Error("id and projectId are required");
    const delivery =
      body.delivery && typeof body.delivery === "object" && !Array.isArray(body.delivery)
        ? (body.delivery as Row)
        : {};
    const emailStatus = normalizeAlertDeliveryStatus(
      body.emailStatus ?? delivery.email,
      true,
    );
    const zaloStatus = normalizeAlertDeliveryStatus(body.zaloStatus ?? delivery.zalo, true);
    const telegramStatus = normalizeAlertDeliveryStatus(
      body.telegramStatus ?? delivery.telegram,
      true,
    );
    await emsDb.execute(
      `UPDATE alert_events
          SET status = COALESCE(?, status), note = ?, category = COALESCE(?, category),
              message = COALESCE(?, message), threshold_value = COALESCE(?, threshold_value),
              acknowledged_by = ?, acknowledged_at = ?,
              email_status = COALESCE(?, email_status),
              zalo_status = COALESCE(?, zalo_status),
              telegram_status = COALESCE(?, telegram_status)
        WHERE id = ? AND project_id = ?`,
      [
        body.status || null,
        body.note ?? null,
        body.category || null,
        body.message || null,
        body.thresholdValue == null ? null : asNumber(body.thresholdValue),
        body.acknowledgedBy || null,
        body.acknowledgedAt || null,
        emailStatus,
        zaloStatus,
        telegramStatus,
        id,
        projectId,
      ],
    );
    return getResource(resource, new NextRequest(`http://localhost/api/ems/alert-events?projectId=${encodeURIComponent(projectId)}`));
  }
  if (resource === "diagram-states") {
    const projectId = asString(body.projectId);
    const utility = asString(body.utility);
    if (!projectId || !utility) throw new Error("projectId and utility are required");
    await ensureDiagramDisplaysColumn();
    await emsDb.execute(
      `INSERT INTO diagram_states (project_id, utility, positions, viewport, displays)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         positions=VALUES(positions),
         viewport=VALUES(viewport),
         displays=VALUES(displays)`,
      [
        projectId,
        utility,
        JSON.stringify(body.positions ?? {}),
        body.viewport ? JSON.stringify(body.viewport) : null,
        body.displays ? JSON.stringify(body.displays) : null,
      ],
    );
    return getResource(resource, new NextRequest(`http://localhost/api/ems/diagram-states?projectId=${encodeURIComponent(projectId)}&utility=${encodeURIComponent(utility)}`));
  }
  if (resource === "project-settings") {
    const projectId = asString(body.projectId);
    if (!projectId) throw new Error("projectId is required");
    await ensureProjectSettingsTable();
    const existing = await queryRows<Row>(
      `SELECT payload FROM project_settings WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1`,
      [projectId],
    );
    const current = jsonField<Row>(existing[0]?.payload, {});
    const incoming =
      body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
        ? (body.payload as Row)
        : jsonField<Row>(body.payload, {});
    const merged = { ...current, ...incoming };
    const payload = JSON.stringify(merged);
    await emsDb.execute(
      `INSERT INTO project_settings (project_id, payload) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
      [projectId, payload],
    );
    return getResource(resource, new NextRequest(`http://localhost/api/ems/project-settings?projectId=${encodeURIComponent(projectId)}`));
  }
  throw new Error(`Unknown resource: ${resource}`);
}

async function deleteResource(resource: string, request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) throw new Error("id is required");
  const tables: Record<string, string> = {
    accounts: "accounts",
    devices: "devices",
    "emission-factors": "emission_factor_groups",
    "meter-types": "meter_types",
    "customer-accounts": "customer_accounts",
    "ghg-sources": "ghg_emission_sources",
  };
  if (resource === "diagram-states") {
    const projectId = request.nextUrl.searchParams.get("projectId");
    const utility = request.nextUrl.searchParams.get("utility");
    if (!projectId || !utility) throw new Error("projectId and utility are required");
    await emsDb.execute("DELETE FROM diagram_states WHERE project_id = ? AND utility = ?", [projectId, utility]);
    return { ok: true };
  }
  if (resource === "projects") {
    await transaction(async (connection) => {
      await connection.execute("UPDATE meter_points SET parent_id = NULL WHERE project_id = ?", [id]);
      await connection.execute("DELETE FROM projects WHERE id = ?", [id]);
    });
    return { ok: true };
  }
  const table = tables[resource];
  if (!table) throw new Error(`Delete is not supported for ${resource}`);
  const key = resource === "emission-factors" ? "id" : resource === "meter-types" ? "name" : "id";
  if (resource === "devices") {
    await ensureDeviceColumns();
    await emsDb.execute("UPDATE meter_points SET device_id = NULL WHERE device_id = ?", [id]);
  }
  if (resource === "meter-types") {
    const existing = await queryRows<{ builtin: number }>(
      "SELECT builtin FROM meter_types WHERE name = ? LIMIT 1",
      [id],
    );
    if (existing[0]?.builtin) throw new Error("Không thể xóa loại điểm đo mặc định.");
  }
  await emsDb.execute(`DELETE FROM ${table} WHERE ${key} = ?`, [id]);
  return { ok: true };
}

export async function GET(request: NextRequest, context: Params) {
  try {
    const resource = await resourceName(context);
    if (!RESOURCE_NAMES.has(resource)) return badRequest("Tài nguyên không hợp lệ.");
    return Response.json(await getResource(resource, request));
  } catch (error) {
    return serverError(error);
  }
}

async function canMutateCustomerAccounts(body?: Row, deletingId?: string | null) {
  const session = await getServerSession();
  if (!session) return { ok: false as const, message: "Cần đăng nhập." };
  if (hasPermission(session, "manageUsers")) return { ok: true as const, session };
  if (session.portal === "customer" && normalizeCustomerAccountRole(session.role) === "Admin") {
    if (body) {
      const role = normalizeCustomerAccountRole(body.role);
      if (role === "Admin") {
        return {
          ok: false as const,
          message: "Admin khách chỉ tạo được tài khoản nhánh: Chỉ xem hoặc Xem và chỉnh sửa.",
        };
      }
      // Giữ đúng quyền nhánh đã chọn (View | Edit), không ép Manage
      body.role = role;
    }
    if (deletingId) {
      const rows = await queryRows<{ role: string }>(
        `SELECT COALESCE(role, 'Edit') AS role FROM customer_accounts WHERE id = ? LIMIT 1`,
        [deletingId],
      );
      if (normalizeCustomerAccountRole(rows[0]?.role) === "Admin") {
        return { ok: false as const, message: "Không thể xóa tài khoản Admin." };
      }
    }
    return { ok: true as const, session };
  }
  return { ok: false as const, message: "Không có quyền quản lý tài khoản khách hàng." };
}

export async function POST(request: NextRequest, context: Params) {
  try {
    const resource = await resourceName(context);
    if (!RESOURCE_NAMES.has(resource)) return badRequest("Tài nguyên không hợp lệ.");
    const body = (await request.json()) as Row;
    if (resource === "accounts") {
      const session = await getServerSession();
      if (!session || session.portal !== "admin") {
        return forbidden("Cần đăng nhập cổng quản trị.");
      }
      const isAdminActor = hasPermission(session, "manageUsers");
      const targetId = asString(body.id);
      const isSelf = Boolean(targetId && session.userId === targetId);
      if (!isAdminActor && !(isSelf && !Array.isArray(body.items))) {
        return forbidden("Chỉ Admin được quản lý tài khoản; cấp dưới chỉ sửa được tài khoản của mình.");
      }
    }
    if (resource === "customer-accounts") {
      const gate = await canMutateCustomerAccounts(body);
      if (!gate.ok) return forbidden(gate.message);
      // Staff EMS được chọn Admin / View / Edit; Admin khách chỉ tạo View|Edit (đã ép ở gate).
      if (gate.session.portal === "admin") {
        body.role = normalizeCustomerAccountRole(body.role ?? "Admin");
      }
    }
    return Response.json(await saveResource(resource, body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("Mật khẩu") ||
      message.includes("quyền") ||
      message.includes("Admin") ||
      message.includes("Manage nội bộ")
    ) {
      return Response.json({ error: message }, { status: 400 });
    }
    return serverError(error);
  }
}

export async function DELETE(request: NextRequest, context: Params) {
  try {
    const resource = await resourceName(context);
    if (!RESOURCE_NAMES.has(resource)) return badRequest("Tài nguyên không hợp lệ.");
    if (resource === "accounts") {
      const gate = await requirePermission("manageUsers");
      if (!gate.ok) return forbidden("Chỉ Quản trị viên được quản lý tài khoản.");
    }
    if (resource === "customer-accounts") {
      const id = request.nextUrl.searchParams.get("id");
      const gate = await canMutateCustomerAccounts(undefined, id);
      if (!gate.ok) return forbidden(gate.message);
    }
    return Response.json(await deleteResource(resource, request));
  } catch (error) {
    return serverError(error);
  }
}
