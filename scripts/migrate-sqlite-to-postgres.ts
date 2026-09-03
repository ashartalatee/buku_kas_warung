import "./_load-env";

// Script SEKALI PAKAI: pindahkan data yang sudah ada di talatee.sqlite
// (data pilot warung yang sudah berjalan) ke database Postgres yang baru.
//
// PENTING: jalankan ini SEBELUM menghapus/mengarsipkan talatee.sqlite, dan
// jalankan backup manual (pg_dump) setelah selesai untuk jaga-jaga.
//
// Pakai:
//   npx tsx scripts/migrate-sqlite-to-postgres.ts ./talatee.sqlite
//
// (Butuh better-sqlite3 masih terinstall -- sudah ada di package.json,
// tidak usah install ulang. Aman dihapus dari dependencies SETELAH script
// ini selesai dipakai dan tidak dibutuhkan lagi.)

import Database from "better-sqlite3";
import { openDatabase } from "../lib/talatee-core/db";

async function main() {
  const sqlitePath = process.argv[2];
  if (!sqlitePath) {
    console.error("Pakai: npx tsx scripts/migrate-sqlite-to-postgres.ts <path-ke-talatee.sqlite>");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL belum diisi di .env.local.");
    process.exit(1);
  }

  const sqlite = new Database(sqlitePath, { readonly: true });
  const pg = openDatabase(connectionString!);

  console.log(`Membaca dari ${sqlitePath}, menulis ke Postgres (${connectionString.replace(/:[^:@]+@/, ":***@")})`);
  console.log("");

  // Urutan INSERT wajib mengikuti foreign key: businesses dulu, baru
  // sources, baru transactions, baru transaction_lines/events/flags.

  const businesses = sqlite.prepare(`SELECT * FROM businesses`).all() as any[];
  for (const b of businesses) {
    await pg.run(
      `INSERT INTO businesses (business_id, business_name, business_type, created_at)
       VALUES ($1, $2, $3, $4) ON CONFLICT (business_id) DO NOTHING`,
      [b.business_id, b.business_name, b.business_type, b.created_at]
    );
  }
  console.log(`businesses: ${businesses.length} baris dipindahkan`);

  const sources = sqlite.prepare(`SELECT * FROM sources`).all() as any[];
  for (const s of sources) {
    await pg.run(
      `INSERT INTO sources
         (source_id, business_id, source_type, original_filename, file_hash, uploaded_by,
          uploaded_at, status, failure_reason, row_count, processed_row_count, whatsapp_message_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (source_id) DO NOTHING`,
      [
        s.source_id,
        s.business_id,
        s.source_type,
        s.original_filename,
        s.file_hash,
        s.uploaded_by,
        s.uploaded_at,
        s.status,
        s.failure_reason,
        s.row_count,
        s.processed_row_count,
        s.whatsapp_message_id,
      ]
    );
  }
  console.log(`sources: ${sources.length} baris dipindahkan`);

  const transactions = sqlite.prepare(`SELECT * FROM transactions`).all() as any[];
  for (const t of transactions) {
    await pg.run(
      `INSERT INTO transactions
         (row_id, transaction_id, version, business_id, source_id, external_reference,
          transaction_date, transaction_time, total_amount, line_item_count, status,
          previous_row_id, validation_notes, created_at, created_by, resolved_at, resolved_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (row_id) DO NOTHING`,
      [
        t.row_id,
        t.transaction_id,
        t.version,
        t.business_id,
        t.source_id,
        t.external_reference,
        t.transaction_date,
        t.transaction_time,
        t.total_amount,
        t.line_item_count,
        t.status,
        t.previous_row_id,
        t.validation_notes,
        t.created_at,
        t.created_by,
        t.resolved_at,
        t.resolved_by,
      ]
    );
  }
  console.log(`transactions: ${transactions.length} baris dipindahkan`);

  const lines = sqlite.prepare(`SELECT * FROM transaction_lines`).all() as any[];
  for (const l of lines) {
    await pg.run(
      `INSERT INTO transaction_lines
         (line_id, transaction_row_id, product_or_service, category, quantity, unit_price,
          subtotal, weight_kg, service_type, sparepart, technician)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (line_id) DO NOTHING`,
      [
        l.line_id,
        l.transaction_row_id,
        l.product_or_service,
        l.category,
        l.quantity,
        l.unit_price,
        l.subtotal,
        l.weight_kg,
        l.service_type,
        l.sparepart,
        l.technician,
      ]
    );
  }
  console.log(`transaction_lines: ${lines.length} baris dipindahkan`);

  const events = sqlite.prepare(`SELECT * FROM transaction_events`).all() as any[];
  for (const e of events) {
    await pg.run(
      `INSERT INTO transaction_events
         (event_id, transaction_id, from_row_id, to_row_id, event_type, reason, reason_detail,
          performed_by, performed_at, confirmed_via_whatsapp, whatsapp_confirmation_message_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (event_id) DO NOTHING`,
      [
        e.event_id,
        e.transaction_id,
        e.from_row_id,
        e.to_row_id,
        e.event_type,
        e.reason,
        e.reason_detail,
        e.performed_by,
        e.performed_at,
        Boolean(e.confirmed_via_whatsapp), // SQLite: 0/1 -> Postgres: boolean asli
        e.whatsapp_confirmation_message_id,
      ]
    );
  }
  console.log(`transaction_events: ${events.length} baris dipindahkan`);

  const flags = sqlite.prepare(`SELECT * FROM duplicate_flags`).all() as any[];
  for (const f of flags) {
    await pg.run(
      `INSERT INTO duplicate_flags
         (flag_id, business_id, transaction_row_id, candidate_row_id, match_type, match_score,
          matched_fields, resolution_status, resolved_by, resolved_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (flag_id) DO NOTHING`,
      [
        f.flag_id,
        f.business_id,
        f.transaction_row_id,
        f.candidate_row_id,
        f.match_type,
        f.match_score,
        f.matched_fields,
        f.resolution_status,
        f.resolved_by,
        f.resolved_at,
        f.created_at,
      ]
    );
  }
  console.log(`duplicate_flags: ${flags.length} baris dipindahkan`);

  console.log("");
  console.log("✅ Migrasi data selesai. SANGAT DISARANKAN: bandingkan angka di atas");
  console.log("   dengan jumlah baris asli di SQLite sebelum menghapus file lama.");
  console.log("   Cek juga npm run backup sekali untuk pastikan backup pertama ada.");

  sqlite.close();
  await pg.end();
}

main().catch((err) => {
  console.error("Migrasi data GAGAL:", err instanceof Error ? err.message : err);
  console.error("Database talatee.sqlite Anda TIDAK berubah/rusak -- ini cuma proses baca+copy.");
  process.exit(1);
});

