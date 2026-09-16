import "server-only";
import mysql, { type Pool } from "mysql2/promise";
import type { ExecuteValues } from "mysql2";

const globalForEms = globalThis as typeof globalThis & {
  emsDb?: Pool;
};

export const emsDb =
  globalForEms.emsDb ??
  mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "ems_local",
    charset: "utf8mb4",
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
  });

if (process.env.NODE_ENV !== "production") globalForEms.emsDb = emsDb;

export async function queryRows<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
) {
  const [rows] = await emsDb.execute(sql, params as ExecuteValues[]);
  return rows as T[];
}

export function jsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
