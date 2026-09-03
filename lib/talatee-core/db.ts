// Pengganti lib/talatee-core/db.ts versi SQLite. Bedanya besar:
//   - openDatabase() SQLite tadinya SYNCHRONOUS (better-sqlite3).
//   - Pool Postgres ini semuanya ASYNCHRONOUS -- setiap query wajib
//     di-`await`. Ini alasan kenapa ingest.ts, duplicate.ts, lifecycle.ts,
//     metrics.ts, dan semua route API ikut berubah, bukan cuma file ini.
//
// Query API yang dipakai di seluruh project ini sengaja dibuat MIRIP
// better-sqlite3 (bukan pakai node-postgres `pool.query()` mentah di
// tiap file), lewat helper get/all/run di bawah -- supaya perubahan di
// pemanggil (ingest.ts dkk) minimal dan gampang direview: db.prepare(sql).get(...)
// jadi await db.get(sql, [...]), pola pikirnya sama.

import { Pool } from "pg";

export type Db = Pool & {
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<{ rowCount: number }>;
};

export function openDatabase(connectionString: string): Db {
  const pool = new Pool({ connectionString }) as Db;

  pool.get = async (sql, params = []) => {
    const res = await pool.query(sql, params);
    return res.rows[0];
  };
  pool.all = async (sql, params = []) => {
    const res = await pool.query(sql, params);
    return res.rows;
  };
  pool.run = async (sql, params = []) => {
    const res = await pool.query(sql, params);
    return { rowCount: res.rowCount ?? 0 };
  };

  return pool;
}
