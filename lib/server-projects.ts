import "server-only";
import { normalizeAlertChannels, type Project } from "@/lib/projects";
import { emsDb, jsonField, queryRows } from "@/lib/server-db";

let recipientChannelsReady: Promise<void> | null = null;

function ensureRecipientChannels() {
  if (!recipientChannelsReady) {
    recipientChannelsReady = emsDb
      .query(
        `ALTER TABLE alert_recipients
           ADD COLUMN IF NOT EXISTS channels JSON NULL AFTER phone`,
      )
      .then(() => undefined)
      .catch((error) => {
        recipientChannelsReady = null;
        throw error;
      });
  }
  return recipientChannelsReady;
}

export async function getProjectFromDb(id: string): Promise<Project | undefined> {
  const rows = await queryRows<Record<string, unknown>>(
    `SELECT id, initials, accent, name, customer, status,
            DATE_FORMAT(start_date, '%Y-%m-%d') AS startDate,
            contact_name AS contactName, phone, email, address, logo_url AS logoUrl
       FROM projects WHERE id = ? LIMIT 1`,
    [id],
  );
  const row = rows[0];
  if (!row) return undefined;
  const meterTypes = await queryRows<Record<string, unknown>>(
    `SELECT meter_type_name AS name FROM project_meter_types
      WHERE project_id = ? ORDER BY meter_type_name`,
    [id],
  );
  await ensureRecipientChannels();
  const recipients = await queryRows<Record<string, unknown>>(
    `SELECT id, name, email, phone, channels FROM alert_recipients
      WHERE project_id = ? ORDER BY id`,
    [id],
  );
  return {
    id: row.id as string,
    initials: row.initials as string,
    accent: row.accent as string,
    name: row.name as string,
    customer: row.customer as string,
    status: row.status as Project["status"],
    startDate: row.startDate as string,
    contactName: row.contactName as string | undefined,
    phone: row.phone as string | undefined,
    email: row.email as string | undefined,
    address: row.address as string | undefined,
    logoUrl: row.logoUrl as string | undefined,
    meterTypes: meterTypes.map((item) => item.name as string),
    recipients: recipients.map((item) => {
      const email = String(item.email ?? "");
      const phone = String(item.phone ?? "");
      return {
        id: item.id as string,
        name: item.name as string,
        email,
        phone,
        channels: normalizeAlertChannels(jsonField(item.channels, null) ?? (
          email ? ["email"] : phone ? ["sms"] : ["email"]
        )),
      };
    }),
  };
}
