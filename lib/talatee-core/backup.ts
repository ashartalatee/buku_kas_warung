// Backup database transaksi -- versi Postgres.
//
// BEDA PENTING dari versi SQLite: better-sqlite3 punya method .backup()
// bawaan yang dipanggil dari dalam Node.js. Postgres TIDAK PUNYA itu --
// cara standar & didukung resmi adalah menjalankan tool command-line
// `pg_dump` (bagian dari instalasi Postgres client, sudah ada di server
// mana pun yang sudah menjalankan Postgres). File hasilnya adalah dump
// SQL biasa -- bisa direstore dengan `psql < file.sql` atau
// `pg_restore` tergantung format.
//
// Dipakai dari 2 tempat, sama seperti sebelumnya:
//   - app/api/backup/route.ts  (dipicu n8n scheduler tiap hari)
//   - scripts/backup.ts        (buat backup manual kapan saja lewat CLI)

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execFileAsync = promisify(execFile);

export interface BackupResult {
  file: string;
  size_bytes: number;
  deleted_old: string[];
}

/**
 * Backup database Postgres (`connectionString`) ke folder `backupDir`
 * pakai pg_dump, format plain SQL (.sql), supaya gampang diperiksa isinya
 * atau di-restore parsial kalau perlu (beda dengan format custom yang
 * cuma bisa dibuka lewat pg_restore).
 */
export async function runBackup(
  connectionString: string,
  backupDir: string,
  retentionDays: number
): Promise<BackupResult> {
  fs.mkdirSync(backupDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
  const filename = `talatee-${stamp}.sql`;
  const destPath = path.join(backupDir, filename);

  try {
    await execFileAsync("pg_dump", ["--no-owner", "--no-privileges", "-f", destPath, connectionString]);
  } catch (err) {
    throw new Error(
      `pg_dump gagal dijalankan: ${err instanceof Error ? err.message : String(err)}. ` +
        `Pastikan pg_dump terinstall di server ini dan ada di PATH (biasanya ikut terpasang ` +
        `bareng PostgreSQL server/client tools).`
    );
  }

  const size_bytes = fs.statSync(destPath).size;
  if (size_bytes === 0) {
    throw new Error(`Backup gagal: file hasil (${filename}) berukuran 0 byte.`);
  }

  const deleted_old = cleanupOldBackups(backupDir, retentionDays);

  return { file: filename, size_bytes, deleted_old };
}

function cleanupOldBackups(backupDir: string, retentionDays: number): string[] {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const deleted: string[] = [];

  for (const entry of fs.readdirSync(backupDir)) {
    if (!entry.startsWith("talatee-") || !entry.endsWith(".sql")) continue;
    const fullPath = path.join(backupDir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(fullPath);
      deleted.push(entry);
    }
  }

  return deleted;
}

export function listBackups(backupDir: string) {
  if (!fs.existsSync(backupDir)) return [];
  return fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith("talatee-") && f.endsWith(".sql"))
    .map((f) => {
      const stat = fs.statSync(path.join(backupDir, f));
      return { file: f, size_bytes: stat.size, created_at: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
