import "server-only";
import { defaultClientMeters, type ClientMeter } from "@/lib/client-meters";
import { queryRows } from "@/lib/server-db";

export async function getClientMeterFromDb(projectId: string, meterId: string) {
  const rows = await queryRows<Record<string, unknown>>(
    `SELECT id, name, code, device_type AS type, parent_id AS parentId,
            utility, device_id AS deviceId, serial_number AS serialNumber
       FROM meter_points
      WHERE project_id = ?
      ORDER BY id`,
    [projectId],
  );
  const row = rows.find((item) => String(item.id) === meterId);
  if (!row) {
    return rows.length ? undefined : defaultClientMeters().find((meter) => meter.id === meterId);
  }

  return {
    id: String(row.id),
    name: String(row.name),
    code: String(row.code),
    type: String(row.type),
    parentId: row.parentId == null ? null : String(row.parentId),
    utility: String(row.utility),
    deviceId: row.deviceId == null ? null : String(row.deviceId),
    serialNumber: row.serialNumber == null ? null : String(row.serialNumber),
  } satisfies ClientMeter;
}
