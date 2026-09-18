// Copy this file to: app/api/_lib/session.ts
//
// 15 Sept 2026 (multi-tenant): business_id dibaca dari header
// x-talatee-business-id, yang di-set proxy.ts SETELAH proxy itu sendiri
// memvalidasi cookie sesi / share key / X-Api-Key (lihat catatan lengkap
// di proxy.ts).
//
// 16 Sept 2026 (nonaktifkan client): SEKARANG juga cek is_active di
// database pada SETIAP request -- bukan cuma saat login. Ini penting:
// kalau cuma dicek waktu login, client yang SUDAH login sebelum
// dinonaktifkan bisa tetap pakai sesi lamanya sampai 30 hari (durasi
// cookie). Dengan cek di sini, begitu admin nonaktifkan client lewat
// /ops/clients, request berikutnya dari client itu (walau cookie-nya
// masih valid secara tanda tangan) langsung ditolak.

import { headers } from "next/headers";
import { getDb } from "./db";
import { PLATFORM_ADMIN_SESSION_ID } from "./auth";

export interface CurrentUser {
  business_id: string;
  user_identifier: string;
  role: "OWNER";
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const headerList = await headers();
  const business_id = headerList.get("x-talatee-business-id");

  if (!business_id) {
    throw new Error(
      "business_id tidak ditemukan di header request. Ini bug -- seharusnya proxy.ts selalu mengisi header ini sebelum request sampai ke sini."
    );
  }

  // Platform Admin bukan baris di tabel businesses -- lewati pengecekan
  // is_active, tidak relevan untuknya.
  if (business_id !== PLATFORM_ADMIN_SESSION_ID) {
    const db = getDb();
    const row = (await db.get(`SELECT is_active FROM businesses WHERE business_id = $1`, [business_id])) as
      | { is_active: boolean }
      | undefined;

    if (!row || !row.is_active) {
      throw new Error("Akun ini sudah tidak aktif. Hubungi Talatee untuk info lebih lanjut.");
    }
  }

  return {
    business_id,
    user_identifier: process.env.TALATEE_PILOT_OWNER_ID ?? "owner",
    role: "OWNER",
  };
}
