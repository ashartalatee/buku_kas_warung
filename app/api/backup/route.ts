// POST /api/backup
//
// Dipicu terjadwal oleh n8n -- proxy.ts mewajibkan header X-Api-Key
// (N8N_LOCAL_API_KEY), sama seperti endpoint upload/reports.

import { NextResponse } from "next/server";
import { runBackup, listBackups } from "@/lib/talatee-core/backup";

function getBackupConfig() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL belum diisi di .env.local.");
  }
  const backupDir = process.env.BACKUP_DIR ?? "./backups";
  const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS ?? "14");
  return { connectionString, backupDir, retentionDays };
}

export async function POST() {
  try {
    const { connectionString, backupDir, retentionDays } = getBackupConfig();
    const result = await runBackup(connectionString, backupDir, retentionDays);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { backupDir } = getBackupConfig();
  return NextResponse.json({ backups: listBackups(backupDir) });
}
