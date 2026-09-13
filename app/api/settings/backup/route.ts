// Copy to: app/api/settings/backup/route.ts
//
// Diproteksi sama seperti /api/products, /api/transactions, dll: wajib
// cookie sesi (jalur default proxy.ts) -- BEDA dari /api/backup yang
// sudah ada (itu wajib X-Api-Key, dipicu n8n scheduler harian). Ini versi
// untuk dipanggil manual dari browser lewat tombol di Settings, memakai
// fungsi runBackup/listBackups yang SAMA PERSIS -- tidak ada logic baru.

import { NextResponse } from "next/server";
import { runBackup, listBackups } from "@/lib/talatee-core/backup";

const BACKUP_DIR = process.env.BACKUP_DIR ?? "./backups";
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS ?? "14");

export async function GET() {
  try {
    const backups = listBackups(BACKUP_DIR);
    return NextResponse.json({ backups });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Gagal memuat daftar backup." }, { status: 500 });
  }
}

export async function POST() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi di .env.local." }, { status: 500 });
  }
  try {
    const result = await runBackup(connectionString, BACKUP_DIR, RETENTION_DAYS);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Backup gagal." }, { status: 500 });
  }
}
