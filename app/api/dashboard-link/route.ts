// Copy to: app/api/dashboard-link/route.ts
// GET /api/dashboard-link -- dilindungi session admin (lewat proxy.ts,
// sama seperti route admin lain). Cuma nyusun ulang link yang sudah dikirim
// bot WA (/dashboard?key=...) supaya bisa dibuka juga dari panel admin
// tanpa perlu copy-paste DASHBOARD_SHARE_KEY manual dari .env.local.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/api/_lib/session";

export async function GET() {
  getCurrentUser(); // sengaja dipanggil biar konsisten dgn route admin lain, walau proxy.ts sudah menjaga

  const key = process.env.DASHBOARD_SHARE_KEY;
  if (!key || key.length < 8) {
    return NextResponse.json(
      { error: "DASHBOARD_SHARE_KEY belum diisi (atau terlalu pendek) di .env.local." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: `/dashboard?key=${encodeURIComponent(key)}` });
}
