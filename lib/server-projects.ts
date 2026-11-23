import "server-only";
import {
  normalizeAlertChannels,
  type PendingManagerTransfer,
  type Project,
  type ProjectManagerHistoryEntry,
} from "@/lib/projects";
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

async function loadManagerHistory(projectId: string): Promise<{
  managerHistory: ProjectManagerHistoryEntry[];
  pendingManagerTransfer: PendingManagerTransfer | null;
}> {
  const historyRows = await queryRows<Record<string, unknown>>(
    `SELECT id,
            from_account_id AS fromAccountId, from_username AS fromUsername,
            to_account_id AS toAccountId, to_username AS toUsername,
            DATE_FORMAT(transfer_date, '%Y-%m-%d') AS transferDate,
            DATE_FORMAT(applied_at, '%Y-%m-%d %H:%i') AS appliedAt,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS createdAt
       FROM project_manager_history
      WHERE project_id = ?
      ORDER BY transfer_date DESC, created_at DESC`,
    [projectId],
  ).catch(async () => {
    // Bảng/cột cũ chưa có applied_at
    return queryRows<Record<string, unknown>>(
      `SELECT id,
              from_account_id AS fromAccountId, from_username AS fromUsername,
              to_account_id AS toAccountId, to_username AS toUsername,
              DATE_FORMAT(transfer_date, '%Y-%m-%d') AS transferDate,
              NULL AS appliedAt,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS createdAt
         FROM project_manager_history
        WHERE project_id = ?
        ORDER BY transfer_date DESC, created_at DESC`,
      [projectId],
    ).catch(() => [] as Record<string, unknown>[]);
  });

  const managerHistory: ProjectManagerHistoryEntry[] = historyRows.map((row) => ({
    id: String(row.id),
    fromAccountId: row.fromAccountId ? String(row.fromAccountId) : undefined,
    fromUsername: row.fromUsername ? String(row.fromUsername) : undefined,
    toAccountId: String(row.toAccountId),
    toUsername: String(row.toUsername),
    transferDate: String(row.transferDate ?? ""),
    createdAt: String(row.createdAt ?? ""),
    appliedAt: row.appliedAt ? String(row.appliedAt) : null,
  }));

  const pending = managerHistory.find((item) => !item.appliedAt) ?? null;
  const pendingManagerTransfer: PendingManagerTransfer | null = pending
    ? {
        id: pending.id,
        fromAccountId: pending.fromAccountId,
        fromUsername: pending.fromUsername,
        toAccountId: pending.toAccountId,
        toUsername: pending.toUsername,
        transferDate: pending.transferDate,
      }
    : null;

  return { managerHistory, pendingManagerTransfer };
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
  const { managerHistory, pendingManagerTransfer } = await loadManagerHistory(id);
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
    managerHistory,
    pendingManagerTransfer,
  };
}
