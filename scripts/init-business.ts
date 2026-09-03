import "./_load-env";

// Dipakai tiap kali setup instalasi BARU untuk 1 warung/laundry/bengkel
// -- versi Postgres.
//
// Pakai:
//   npm run init-business -- "Warung Ibu Sari" warung
//
// Bedanya dari versi SQLite: skrip ini sekarang ASYNC (query Postgres
// tidak bisa synchronous), dan butuh DATABASE_URL di .env.local, bukan
// TALATEE_DB_PATH.

import { openDatabase } from "../lib/talatee-core/db";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = ["warung", "laundry", "bengkel"] as const;
type BusinessType = (typeof ALLOWED_TYPES)[number];

function parseArgs(): { name: string; type: BusinessType } {
  const [name, typeArg] = process.argv.slice(2);

  if (!name || name.trim() === "") {
    console.error('Nama warung wajib diisi.\nContoh: npm run init-business -- "Warung Ibu Sari" warung');
    process.exit(1);
  }

  const type = (typeArg ?? "warung").toLowerCase();
  if (!ALLOWED_TYPES.includes(type as BusinessType)) {
    console.error(`business_type "${typeArg}" tidak valid. Pilih salah satu: ${ALLOWED_TYPES.join(", ")}`);
    process.exit(1);
  }

  return { name: name.trim(), type: type as BusinessType };
}

async function main() {
  const { name, type } = parseArgs();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL belum diisi di .env.local.");
    process.exit(1);
  }

  const db = openDatabase(connectionString!);
  const business_id = randomUUID();

  await db.run(`INSERT INTO businesses (business_id, business_name, business_type) VALUES ($1, $2, $3)`, [
    business_id,
    name,
    type,
  ]);

  console.log(`Business dibuat: "${name}" (${type})`);
  console.log("business_id:", business_id);
  console.log("");
  console.log("Langkah selanjutnya untuk instalasi klien ini:");
  console.log(`1. Isi .env.local:  TALATEE_PILOT_BUSINESS_ID=${business_id}`);
  console.log("2. Isi TALATEE_PILOT_OWNER_ID dengan nomor WA / nama pemilik warung");
  console.log("3. Set OWNER_PASSWORD (password login dashboard untuk warung ini)");
  console.log("4. Restart npm run dev, lalu test login di /login");

  await db.end();
}

main().catch((err) => {
  console.error("Gagal membuat business:", err instanceof Error ? err.message : err);
  process.exit(1);
});

