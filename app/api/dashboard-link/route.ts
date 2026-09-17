// Copy to: app/api/dashboard-link/route.ts
// GET /api/dashboard-link -- dilindungi session admin (lewat proxy.ts,
// sama seperti route admin lain). Cuma nyusun ulang link yang bisa
// dikirim ke bot WA (/dashboard?key=...) supaya bisa dibuka juga dari
// panel admin tanpa perlu copy-paste manual.
//
// 15 Sept 2026 (multi-tenant): key sekarang dibikin per-business lewat
// createShareKey() (HMAC, lihat auth.ts) -- BUKAN lagi 1 DASHBOARD_SHARE_KEY
// global dari env var. Deterministik: business_id yang sama selalu
// menghasilkan key yang sama, jadi aman dipanggil berulang.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/api/_lib/session";
import { createShareKey } from "@/app/api/_lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  const key = createShareKey(user.business_id);
  return NextResponse.json({ url: `/dashboard?key=${encodeURIComponent(key)}` });
}
