import "server-only";
import mysql, { type Pool } from "mysql2/promise";
import type { ExecuteValues } from "mysql2";

type PoolCache = {
  pool?: Pool;
  key?: string;
};

const globalForEms = globalThis as typeof globalThis & {
  emsDb?: Pool;
  emsDbCache?: PoolCache;
};

function poolConfig() {
  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "ems_local",
    charset: "utf8mb4",
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
  };
}

function poolKey() {
  const config = poolConfig();
  return [config.host, config.port, config.user, config.password, config.database].join("|");
}

function getEmsDb(): Pool {
  globalForEms.emsDbCache ??= {};
  const cache = globalForEms.emsDbCache;
  const key = poolKey();
  if (cache.pool && cache.key === key) return cache.pool;

  const previous = cache.pool ?? globalForEms.emsDb;
  cache.pool = mysql.createPool(poolConfig());
  cache.key = key;
  delete globalForEms.emsDb;
  void previous?.end().catch(() => undefined);
  return cache.pool;
}

export const emsDb: Pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const pool = getEmsDb();
    const value = Reflect.get(pool, prop, pool);
    return typeof value === "function" ? value.bind(pool) : value;
  },
});

export async function queryRows<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
) {
  const [rows] = await getEmsDb().execute(sql, params as ExecuteValues[]);
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
