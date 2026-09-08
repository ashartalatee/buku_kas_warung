import "./_load-env";

// Migrasi untuk fitur "Sampah" (7 Sept 2026) -- tambah kolom deleted_at/
// deleted_by ke transactions & sources di database yang SUDAH JALAN
// (schema.sql pakai CREATE TABLE IF NOT EXISTS, jadi tidak akan menyentuh
// tabel yang sudah ada -- perlu ALTER TABLE terpisah kayak gini).
//
// Aman dijalankan berkali-kali (semua langkah pakai IF NOT EXISTS/
// IF EXISTS), jadi tidak masalah kalau ke-run 2x.
//
// Pakai:
//   npx tsx scripts/migrate-add-trash.ts

import { openDatabase } from "../lib/talatee-core/db";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL belum diisi di .env.local.");
    process.exit(1);
  }

  const db = openDatabase(connectionString);

  console.log("1/5 Menambah kolom transactions.deleted_at / deleted_by ...");
  await db.run(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
  await db.run(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_by TEXT`);

  console.log("2/5 Menambah kolom sources.deleted_at / deleted_by ...");
  await db.run(`ALTER TABLE sources ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
  await db.run(`ALTER TABLE sources ADD COLUMN IF NOT EXISTS deleted_by TEXT`);

  console.log("3/5 Membuat index untuk query Sampah ...");
  await db.run(
    `CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON transactions(deleted_at) WHERE deleted_at IS NOT NULL`
  );

  console.log("4/5 Mengganti UNIQUE(business_id, file_hash) di sources jadi partial index ...");
  // Nama constraint bawaan Postgres untuk `UNIQUE (business_id, file_hash)`
  // inline di CREATE TABLE adalah <table>_<col1>_<col2>_key. DROP dulu,
  // baru bikin partial unique index (deleted_at IS NULL) -- supaya file
  // yang sama bisa diupload ulang setelah batch lamanya dibuang ke Sampah.
  await db.run(`ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_business_id_file_hash_key`);
  await db.run(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_sources_business_file_hash_active
       ON sources(business_id, file_hash) WHERE deleted_at IS NULL`
  );

  console.log("5/5 Selesai.");
  await db.end();
}

main().catch((err) => {
  console.error("Migrasi gagal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
