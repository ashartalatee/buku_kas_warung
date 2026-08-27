// Copy to: app/api/reports/daily/route.ts
//
// Same response shape as the old Flask API's /laporan-harian and
// /laporan-terbaru: { tanggal, total_revenue, total_orders, aov,
// top_produk: [{produk, qty_terjual}] }. Kept identical on purpose so
// the existing n8n "Susun Jawaban Teks" node needs no changes — only
// the URL in "Ambil Metrik dari API..." needs to point here.
//
// GET /api/reports/daily?date=2026-08-23 (defaults to today if omitted)

import { NextRequest, NextResponse } from "next/server";
import { getDailyReport } from "@/lib/talatee-core/metrics"; // adjust path
import { getDb } from "../../_lib/db";
import { getCurrentUser } from "../../_lib/session";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const user = getCurrentUser();
  const db = getDb();
  return NextResponse.json(getDailyReport(db, user.business_id, date));
}
