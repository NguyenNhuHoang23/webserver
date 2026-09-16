import type { PoolConnection } from "mysql2/promise";
import { NextRequest } from "next/server";
import { emsDb, jsonField, queryRows } from "@/lib/server-db";

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
]);

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

function serverError(error: unknown) {
  console.error("EMS API error", error);
  return Response.json({ error: "Không thể xử lý dữ liệu trên database." }, { status: 500 });
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
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
  const recipients = await queryRows<Row>(
    `SELECT id, project_id AS projectId, name, email, phone
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
    recipientsByProject.set(id, [...(recipientsByProject.get(id) ?? []), {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
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
    return queryRows<Row>(
      `SELECT id, username, email, role, DATE_FORMAT(created_at, '%d/%m/%Y') AS createdAt
         FROM accounts ORDER BY created_at DESC, id`,
    );
  }
  if (resource === "customer-accounts") {
    return queryRows<Row>(
      `SELECT id, username, email, display_name AS displayName, project_id AS projectId
         FROM customer_accounts ${projectId ? "WHERE project_id = ?" : ""}
        ORDER BY id`,
      projectId ? [projectId] : [],
    );
  }
  if (resource === "projects") return getProjects(projectId);
  if (resource === "devices") {
    const rows = await queryRows<Row>(
      `SELECT id, name, serial_number AS sn, brand_model AS brandModel, brand,
              device_type AS type, kind, status, last_sync_label AS lastSync,
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
    const rows = await queryRows<Row>(
      `SELECT id, project_id AS projectId, scope_id AS scope, name,
              meter_point_id AS meterPointId,
              input_method AS method, factor_group_id AS factorGroupId,
              gas_key AS gasKey, factor_value AS factorValue, formula,
              DATE_FORMAT(applied_at, '%Y-%m-%d') AS appliedAt,
              tons_co2e AS tons
         FROM ghg_emission_sources ${projectId ? "WHERE project_id = ?" : ""}
        ORDER BY scope, id`,
      projectId ? [projectId] : [],
    );
    return rows.map((row) => ({
      ...row,
      scope: asNumber(row.scope),
      factorId: `${row.factorGroupId}:${row.gasKey}`,
      factorValue: asNumber(row.factorValue),
      tons: row.tons == null ? undefined : asNumber(row.tons),
    }));
  }
  if (resource === "alert-events") {
    const rows = await queryRows<Row>(
      `SELECT a.id, a.project_id AS projectId, a.meter_point_id AS meterPointId,
              DATE_FORMAT(a.occurred_at, '%Y-%m-%d %H:%i:%s') AS occurredAt,
              a.parameter_name AS parameter, a.value, a.unit, a.severity, a.status, a.note,
              a.category, a.message, a.threshold_value AS thresholdValue,
              a.acknowledged_by AS acknowledgedBy,
              DATE_FORMAT(a.acknowledged_at, '%Y-%m-%d %H:%i:%s') AS acknowledgedAt,
              p.code AS pointCode, p.name AS pointName, p.utility
         FROM alert_events a
         LEFT JOIN meter_points p ON p.id = a.meter_point_id
        ${projectId ? "WHERE a.project_id = ?" : ""}
        ORDER BY occurred_at DESC`,
      projectId ? [projectId] : [],
    );
    return rows.map((row) => ({
      ...row,
      value: asNumber(row.value),
      thresholdValue: row.thresholdValue == null ? undefined : asNumber(row.thresholdValue),
    }));
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
    const utility = request.nextUrl.searchParams.get("utility");
    const rows = await queryRows<Row>(
      `SELECT project_id AS projectId, utility, positions, viewport, updated_at AS updatedAt
         FROM diagram_states WHERE project_id = ? ${utility ? "AND utility = ?" : ""}
        ORDER BY utility`,
      utility ? [projectId, utility] : [projectId],
    );
    return rows.map((row) => ({
      ...row,
      positions: jsonField(row.positions, {}),
      viewport: jsonField(row.viewport, undefined),
    }));
  }
  if (resource === "project-settings") {
    if (!projectId) throw new Error("projectId is required");
    const rows = await queryRows<Row>(
      "SELECT project_id AS projectId, payload, updated_at AS updatedAt FROM project_settings WHERE project_id = ?",
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
    const items = Array.isArray(body.items) ? body.items : [body];
    for (const item of items as Row[]) {
      const password = asString(item.password, "123456");
      await emsDb.execute(
        `INSERT INTO accounts (id, username, email, role, password_hash, created_at)
         VALUES (?, ?, ?, ?, SHA2(?, 256), STR_TO_DATE(?, '%d/%m/%Y'))
         ON DUPLICATE KEY UPDATE username=VALUES(username), email=VALUES(email),
           role=VALUES(role), created_at=VALUES(created_at),
           password_hash=IF(? = '', password_hash, SHA2(?, 256))`,
        [item.id, item.username, item.email, item.role, password, item.createdAt, password, password],
      );
    }
    return getResource(resource, new NextRequest("http://localhost/api/ems/accounts"));
  }
  if (resource === "customer-accounts") {
    const password = asString(body.password, "123456");
    await emsDb.execute(
      `INSERT INTO customer_accounts (id, username, email, display_name, project_id, password_hash)
       VALUES (?, ?, ?, ?, ?, SHA2(?, 256))
       ON DUPLICATE KEY UPDATE username=VALUES(username), email=VALUES(email),
         display_name=VALUES(display_name), project_id=VALUES(project_id),
         password_hash=IF(? = '', password_hash, SHA2(?, 256))`,
      [body.id, body.username, body.email, body.displayName, body.projectId, password, password, password],
    );
    return getResource(resource, new NextRequest("http://localhost/api/ems/customer-accounts"));
  }
  if (resource === "projects") {
    if (Array.isArray(body.items)) {
      for (const item of body.items as Row[]) await saveResource(resource, item);
      return getProjects();
    }
    const meterTypes = Array.isArray(body.meterTypes) ? body.meterTypes.filter(Boolean) as string[] : [];
    const recipients = Array.isArray(body.recipients) ? body.recipients as Row[] : [];
    await transaction(async (connection) => {
      await connection.execute(
        `INSERT INTO projects (id, initials, accent, name, customer, status, start_date,
           contact_name, phone, email, address, logo_url)
         VALUES (?, ?, ?, ?, ?, ?, COALESCE(STR_TO_DATE(?, '%Y-%m-%d'), STR_TO_DATE(?, '%d/%m/%Y')),
           ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE initials=VALUES(initials), accent=VALUES(accent),
           name=VALUES(name), customer=VALUES(customer), status=VALUES(status),
           start_date=VALUES(start_date), contact_name=VALUES(contact_name),
           phone=VALUES(phone), email=VALUES(email), address=VALUES(address),
           logo_url=VALUES(logo_url)`,
        [body.id, body.initials, body.accent, body.name, body.customer, body.status,
          body.startDate, body.startDate, body.contactName || null, body.phone || null,
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
        await connection.execute(
          `INSERT INTO alert_recipients (id, project_id, name, email, phone)
           VALUES (?, ?, ?, ?, ?)`,
          [recipient.id, body.id, recipient.name || "", recipient.email || "", recipient.phone || ""],
        );
      }
    });
    return getProjects(asString(body.id));
  }
  if (resource === "devices") {
    if (Array.isArray(body.items)) {
      for (const item of body.items as Row[]) await saveResource(resource, item);
      return getResource(resource, new NextRequest("http://localhost/api/ems/devices"));
    }
    await emsDb.execute(
      `INSERT INTO devices
        (id, name, serial_number, brand_model, brand, device_type, kind, status,
         last_sync_label, protocol, notes, image, extra_fields, registers)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), serial_number=VALUES(serial_number),
         brand_model=VALUES(brand_model), brand=VALUES(brand), device_type=VALUES(device_type),
         kind=VALUES(kind), status=VALUES(status), last_sync_label=VALUES(last_sync_label),
         protocol=VALUES(protocol), notes=VALUES(notes), image=VALUES(image),
         extra_fields=VALUES(extra_fields), registers=VALUES(registers)`,
      [body.id, body.name, body.sn, body.brandModel, body.brand, body.type, body.kind,
        body.status, body.lastSync, body.protocol || null, body.notes || null, body.image || null,
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
        await connection.execute(
          `INSERT INTO meter_types (name, description, icon, builtin)
           SELECT ?, description, icon, builtin FROM meter_types WHERE name = ?
           ON DUPLICATE KEY UPDATE description=VALUES(description)`,
          [name, previousName],
        );
        await connection.execute("UPDATE project_meter_types SET meter_type_name = ? WHERE meter_type_name = ?", [name, previousName]);
        await connection.execute("DELETE FROM meter_types WHERE name = ? AND builtin = 0", [previousName]);
      } else {
        await connection.execute(
          `INSERT INTO meter_types (name, description, icon, builtin) VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE description=VALUES(description), icon=VALUES(icon), builtin=VALUES(builtin)`,
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
        await connection.execute(
          `INSERT INTO emission_factor_gases (group_id, gas_key, gas_label, factor_value, unit)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE gas_label=VALUES(gas_label), factor_value=VALUES(factor_value), unit=VALUES(unit)`,
          [group.id, gas.key, gas.label, asNumber(gas.value), gas.unit || ""],
        );
      }
    });
    return getResource(resource, new NextRequest("http://localhost/api/ems/emission-factors"));
  }
  if (resource === "ghg-sources") {
    const projectId = asString(body.projectId);
    const sources = Array.isArray(body.sources) ? body.sources as Row[] : [];
    if (!projectId) throw new Error("projectId is required");
    await transaction(async (connection) => {
      await connection.execute("DELETE FROM ghg_emission_sources WHERE project_id = ?", [projectId]);
      for (const source of sources) {
        const factorId = asString(source.factorId);
        const [factorGroupId, gasKey] = factorId.split(":");
        await connection.execute(
          `INSERT INTO ghg_emission_sources
            (id, project_id, scope_id, name, input_method, factor_group_id, gas_key,
             factor_value, formula, applied_at, meter_point_id, tons_co2e)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [source.id, projectId, asNumber(source.scope), source.name, source.method,
            factorGroupId || "do-industry", gasKey || "co2", asNumber(source.factorValue),
            source.formula || "", source.appliedAt, asString(source.meterPointId) || null,
            source.tons == null ? null : asNumber(source.tons)],
        );
      }
    });
    return getResource(resource, new NextRequest(`http://localhost/api/ems/ghg-sources?projectId=${encodeURIComponent(projectId)}`));
  }
  if (resource === "alert-events") {
    const id = asString(body.id);
    const projectId = asString(body.projectId);
    if (!id || !projectId) throw new Error("id and projectId are required");
    await emsDb.execute(
      `UPDATE alert_events
          SET status = COALESCE(?, status), note = ?, category = COALESCE(?, category),
              message = COALESCE(?, message), threshold_value = COALESCE(?, threshold_value),
              acknowledged_by = ?, acknowledged_at = ?
        WHERE id = ? AND project_id = ?`,
      [body.status || null, body.note ?? null, body.category || null, body.message || null,
        body.thresholdValue == null ? null : asNumber(body.thresholdValue), body.acknowledgedBy || null,
        body.acknowledgedAt || null, id, projectId],
    );
    return getResource(resource, new NextRequest(`http://localhost/api/ems/alert-events?projectId=${encodeURIComponent(projectId)}`));
  }
  if (resource === "diagram-states") {
    const projectId = asString(body.projectId);
    const utility = asString(body.utility);
    if (!projectId || !utility) throw new Error("projectId and utility are required");
    await emsDb.execute(
      `INSERT INTO diagram_states (project_id, utility, positions, viewport)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE positions=VALUES(positions), viewport=VALUES(viewport)`,
      [projectId, utility, JSON.stringify(body.positions ?? {}), body.viewport ? JSON.stringify(body.viewport) : null],
    );
    return getResource(resource, new NextRequest(`http://localhost/api/ems/diagram-states?projectId=${encodeURIComponent(projectId)}&utility=${encodeURIComponent(utility)}`));
  }
  if (resource === "project-settings") {
    const projectId = asString(body.projectId);
    if (!projectId) throw new Error("projectId is required");
    await emsDb.execute(
      `INSERT INTO project_settings (project_id, payload) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
      [projectId, JSON.stringify(body.payload ?? {})],
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
  const table = tables[resource];
  if (!table) throw new Error(`Delete is not supported for ${resource}`);
  const key = resource === "emission-factors" ? "id" : resource === "meter-types" ? "name" : "id";
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

export async function POST(request: NextRequest, context: Params) {
  try {
    const resource = await resourceName(context);
    if (!RESOURCE_NAMES.has(resource)) return badRequest("Tài nguyên không hợp lệ.");
    const body = (await request.json()) as Row;
    return Response.json(await saveResource(resource, body));
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(request: NextRequest, context: Params) {
  try {
    const resource = await resourceName(context);
    if (!RESOURCE_NAMES.has(resource)) return badRequest("Tài nguyên không hợp lệ.");
    return Response.json(await deleteResource(resource, request));
  } catch (error) {
    return serverError(error);
  }
}
