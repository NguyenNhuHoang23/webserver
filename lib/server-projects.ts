import "server-only";
import { getProject as getStaticProject, type Project } from "@/lib/projects";
import { queryRows } from "@/lib/server-db";

export async function getProjectFromDb(id: string): Promise<Project | undefined> {
  const rows = await queryRows<Record<string, unknown>>(
    `SELECT id, initials, accent, name, customer, status,
            DATE_FORMAT(start_date, '%Y-%m-%d') AS startDate,
            contact_name AS contactName, phone, email, address, logo_url AS logoUrl
       FROM projects WHERE id = ? LIMIT 1`,
    [id],
  );
  const row = rows[0];
  if (!row) return getStaticProject(id);
  const meterTypes = await queryRows<Record<string, unknown>>(
    `SELECT meter_type_name AS name FROM project_meter_types
      WHERE project_id = ? ORDER BY meter_type_name`,
    [id],
  );
  const recipients = await queryRows<Record<string, unknown>>(
    `SELECT id, name, email, phone FROM alert_recipients
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
    recipients: recipients.map((item) => ({
      id: item.id as string,
      name: item.name as string,
      email: item.email as string,
      phone: item.phone as string,
    })),
  };
}
