// Copy this file to: app/api/_lib/session.ts
//
// 15 Sept 2026 (multi-tenant): business_id dibaca dari header
// x-talatee-business-id, di-set proxy.ts SETELAH proxy memvalidasi
// cookie sesi / share key / X-Api-Key DAN status is_active client
// (lihat proxy.ts). File ini tidak perlu cek is_active lagi -- kalau
// request sampai ke sini, proxy sudah menjamin client-nya aktif.

import { headers } from "next/headers";

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

  return {
    business_id,
    user_identifier: process.env.TALATEE_PILOT_OWNER_ID ?? "owner",
    role: "OWNER",
  };
}
