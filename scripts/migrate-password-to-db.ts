import "./_load-env";

// Script SEKALI PAKAI (12 Sept 2026): pindahkan OWNER_PASSWORD dari
// .env.local (plaintext) ke kolom password_hash di tabel businesses
// (di-hash, lihat lib/talatee-core/password.ts). Password LAMA kamu
// TETAP DIPAKAI (tidak direset) -- cuma cara penyimpanannya yang berubah.
//
// Pakai:
//   npx tsx scripts/migrate-password-to-db.ts
//
// SETELAH script ini sukses dan login masih bisa dipakai seperti biasa,
// baris OWNER_PASSWORD di .env.local sudah tidak dipakai lagi oleh
// aplikasi -- boleh dihapus (opsional, tidak wajib segera).

import { openDatabase } from "../lib/talatee-core/db";
import { hashPassword } from "../lib/talatee-core/password";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL belum diisi di .env.local.");
    process.exit(1);
  }

  const ownerPassword = process.env.OWNER_PASSWORD;
  if (!ownerPassword || ownerPassword.length < 6) {
    console.error("OWNER_PASSWORD belum diisi (atau terlalu pendek) di .env.local.");
    process.exit(1);
  }

  const businessId = process.env.TALATEE_PILOT_BUSINESS_ID;
  if (!businessId) {
    console.error("TALATEE_PILOT_BUSINESS_ID belum diisi di .env.local.");
    process.exit(1);
  }

  const db = openDatabase(connectionString);
  const hash = hashPassword(ownerPassword);

  const existing = await db.get(`SELECT business_id FROM businesses WHERE business_id = $1`, [businessId]);
  if (!existing) {
    console.error(`Business dengan id ${businessId} tidak ditemukan di database.`);
    process.exit(1);
  }

  await db.run(`UPDATE businesses SET password_hash = $1 WHERE business_id = $2`, [hash, businessId]);

  console.log(
    "Selesai -- password sudah dipindahkan ke database (di-hash). Login tetap pakai password yang sama seperti sebelumnya."
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal migrasi password:", err);
  process.exit(1);
});
