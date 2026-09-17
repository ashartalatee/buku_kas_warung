// Copy to: app/api/dashboard-summary/route.ts
// GET /api/dashboard-summary -- data untuk dashboard admin baru (kartu
// metrik + badge "vs kemarin" + jumlah produk aktif + stok menipis).
// Semua angka di sini REAL (dihitung dari transactions/transaction_lines/
// products yang sudah ada) -- tidak ada field yang dikarang.

import { NextResponse } from "next/server";
import { getDashboardSummary, getDailyTrend, getTopProductsInRange } from "@/lib/talatee-core/metrics";
import { getTodayLocalDate } from "@/lib/talatee-core/date-utils";
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";

export async function GET() {
  const user = await getCurrentUser();
  const db = getDb();

  const summary = await getDashboardSummary(db, user.business_id);
  const trend14d = await getDailyTrend(db, user.business_id, 14);

  const dateTo = trend14d[trend14d.length - 1]?.date ?? getTodayLocalDate();
  const dateFrom = trend14d[0]?.date ?? dateTo;
  const topProducts14d = await getTopProductsInRange(db, user.business_id, dateFrom, dateTo, 5);

  return NextResponse.json({ ...summary, trend_14d: trend14d, top_products_14d: topProducts14d });
}
