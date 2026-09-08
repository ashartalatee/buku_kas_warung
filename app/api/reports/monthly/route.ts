// Copy to: app/api/reports/monthly/route.ts
//
// GET /api/reports/monthly              -- bulan kalender SEBELUMNYA (lihat
//                                          getMonthlyReport untuk alasannya)
// GET /api/reports/monthly?year=2026&month=8 -- bulan tertentu (keduanya
//                                          harus diisi bersamaan)
//
// Sama seperti /api/reports/weekly: dipanggil n8n (server-to-server, header
// X-Api-Key -- lihat proxy.ts N8N_ROUTES) untuk laporan bulanan otomatis,
// dan bisa juga dipakai untuk query manual.

import { NextRequest, NextResponse } from "next/server";
import { getMonthlyReport } from "@/lib/talatee-core/metrics";
import { getDb } from "../../_lib/db";
import { getCurrentUser } from "../../_lib/session";

export async function GET(req: NextRequest) {
  const user = getCurrentUser();
  const db = getDb();

  const yearParam = req.nextUrl.searchParams.get("year");
  const monthParam = req.nextUrl.searchParams.get("month");
  const year = yearParam ? Number(yearParam) : undefined;
  const month = monthParam ? Number(monthParam) : undefined;

  if ((year && !month) || (month && !year)) {
    return NextResponse.json(
      { error: "year dan month harus diisi bersamaan (contoh: ?year=2026&month=8)." },
      { status: 400 }
    );
  }
  if (month !== undefined && (month < 1 || month > 12)) {
    return NextResponse.json({ error: "month harus antara 1-12." }, { status: 400 });
  }

  return NextResponse.json(await getMonthlyReport(db, user.business_id, year, month));
}
