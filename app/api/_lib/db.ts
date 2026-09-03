// Copy this file to: app/api/_lib/db.ts
//
// Ganti dari SQLite (better-sqlite3, 1 file lokal) ke PostgreSQL (pool
// koneksi, server terpisah). Singleton pool-nya sama alasannya seperti
// versi SQLite: Next.js dev-mode reload modul berkali-kali, jadi pool
// disimpan di globalThis supaya tidak bikin koneksi baru tiap reload.

import { openDatabase, Db } from "@/lib/talatee-core/db";

const globalForDb = globalThis as unknown as { __talatee_pg?: Db };

export function getDb(): Db {
  if (!globalForDb.__talatee_pg) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL belum diisi di .env.local. Contoh: " +
          "postgresql://talatee:PASSWORD@localhost:5432/buku_kas_warung"
      );
    }
    globalForDb.__talatee_pg = openDatabase(connectionString);
  }
  return globalForDb.__talatee_pg;
}
