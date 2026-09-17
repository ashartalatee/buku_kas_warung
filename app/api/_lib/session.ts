// Copy this file to: app/api/_lib/session.ts
//
// 15 Sept 2026 (multi-tenant): business_id SEKARANG dibaca dari header
// x-talatee-business-id, yang di-set proxy.ts SETELAH proxy itu sendiri
// memvalidasi cookie sesi / share key / X-Api-Key (lihat catatan lengkap
// di proxy.ts). File ini TIDAK melakukan validasi apa pun sendiri --
// proxy.ts sudah menjamin header ini cuma ada isinya kalau request itu
// memang sudah lolos salah satu dari 3 jalur otentikasi yang sah.
//
// user_identifier tetap dari env var untuk sementara (WA/n8n belum
// multi-tenant, lihat proxy.ts) -- field ini cuma dipakai untuk
// mencatat "siapa yang melakukan aksi" (created_by/performed_by), bukan
// untuk keamanan, jadi tidak mendesak untuk diubah sekarang.

import { headers } from "next/headers";

export interface CurrentUser {
  business_id: string;
  user_identifier: string; // e.g. email or WA number; stored as created_by/performed_by
  role: "OWNER";
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const headerList = await headers();
  const business_id = headerList.get("x-talatee-business-id");

  if (!business_id) {
    // Ini seharusnya TIDAK PERNAH terjadi kalau proxy.ts jalan normal --
    // setiap route yang butuh getCurrentUser() sudah pasti lolos proxy
    // dulu (proxy.ts matcher mencakup semua path kecuali aset statis).
    // Kalau sampai ke sini, berarti ada bug di proxy.ts atau route ini
    // sengaja di-skip dari matcher -- gagal keras, bukan diam-diam pakai
    // business_id sembarangan.
    throw new Error(
      "business_id tidak ditemukan di header request. Ini bug -- seharusnya proxy.ts selalu mengisi header ini sebelum request sampai ke sini."
    );
  }

  return {
    business_id,
    user_identifier: process.env.TALATEE_PILOT_OWNER_ID ?? "owner",
    role: "OWNER",
  };
}
