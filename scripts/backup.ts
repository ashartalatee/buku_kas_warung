import "./_load-env";

// Backup manual dari terminal -- versi Postgres.
//
// Pakai:
//   npm run backup

import { runBackup } from "../lib/talatee-core/backup";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL belum diisi di .env.local.");
    process.exit(1);
  }
  const backupDir = process.env.BACKUP_DIR ?? "./backups";
  const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS ?? "14");

  console.log(`Membackup database Postgres -> ${backupDir} ...`);
  const result = await runBackup(connectionString!, backupDir, retentionDays);

  console.log(`Selesai: ${result.file} (${(result.size_bytes / 1024).toFixed(0)} KB)`);
  if (result.deleted_old.length > 0) {
    console.log(`Backup lama dihapus (lebih dari ${retentionDays} hari): ${result.deleted_old.join(", ")}`);
  }
}

main().catch((err) => {
  console.error("Backup gagal:", err instanceof Error ? err.message : err);
  process.exit(1);
});

