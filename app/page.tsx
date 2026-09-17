// Root ("/") redirect ke dashboard, dilakukan di SERVER (bukan client)
// supaya tidak ada roundtrip fetch() dari browser sebelum redirect
// terjadi. Upload dipindah ke /upload, tetap gampang diakses lewat
// tombol "Upload Data" di dashboard.
//
// 15 Sept 2026 (multi-tenant): SEBELUMNYA baca DASHBOARD_SHARE_KEY env
// var langsung -- itu key GLOBAL lama, sudah tidak berlaku sejak sistem
// share key per-business dibuat hari ini (lihat auth.ts createShareKey).
// BUG: file ini lupa ikut diupdate saat migrasi multi-tenant, jadi
// sempat generate link dashboard yang ditolak proxy.ts. Sekarang pakai
// getCurrentUser() + createShareKey() langsung di server -- konsisten
// dengan /api/dashboard-link, sama cepatnya (tidak ada fetch tambahan).

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/api/_lib/session";
import { createShareKey } from "@/app/api/_lib/auth";

export default async function Page() {
  const user = await getCurrentUser();
  const key = createShareKey(user.business_id);
  redirect(`/dashboard?key=${encodeURIComponent(key)}`);
}
