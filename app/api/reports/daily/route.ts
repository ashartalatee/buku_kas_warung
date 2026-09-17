// Copy to: app/api/reports/daily/route.ts
//
// Same response shape as before: { tanggal, total_revenue, total_orders,
// aov, top_produk: [{produk, qty_terjual}] }. n8n workflow tidak perlu
// diubah, cuma pindah data source di baliknya (SQLite -> Postgres).
//
// GET /api/reports/daily?date=2026-08-23 (defaults to today if omitted)

import { NextRequest, NextResponse } from "next/server";
import { getDailyReport } from "@/lib/talatee-core/metrics";
import { getTodayLocalDate } from "@/lib/talatee-core/date-utils";
import { getDb } from "../../_lib/db";
import { getCurrentUser } from "../../_lib/session";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? getTodayLocalDate();
  const user = await getCurrentUser();
  const db = getDb();
  return NextResponse.json(await getDailyReport(db, user.business_id, date));
}
