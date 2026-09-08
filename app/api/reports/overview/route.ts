// GET /api/reports/overview
//
// Menggabungkan semua data yang dibutuhkan halaman dashboard client
// (app/dashboard/page.tsx) jadi 1 request: metrik hari ini, tren 14 hari,
// top 5 produk 14 hari, total minggu ini, dan insight jam/hari tersibuk.

import { NextResponse } from "next/server";
import {
  getDailyMetrics,
  getDailyTrend,
  getTopProductsInRange,
  getWeeklyReport,
  getBusiestSlot,
} from "@/lib/talatee-core/metrics";
import { getTodayLocalDate } from "@/lib/talatee-core/date-utils";
import { getDb } from "../../_lib/db";
import { getCurrentUser } from "../../_lib/session";

export async function GET() {
  const user = getCurrentUser();
  const db = getDb();
  const today = getTodayLocalDate();

  const businessRow = (await db.get(`SELECT business_name FROM businesses WHERE business_id = $1`, [
    user.business_id,
  ])) as { business_name: string } | undefined;

  const daily = await getDailyMetrics(db, user.business_id, today);
  const trend = await getDailyTrend(db, user.business_id, 14);
  const dateFrom = trend[0]?.date ?? today;
  const dateTo = trend[trend.length - 1]?.date ?? today;
  const topProducts = await getTopProductsInRange(db, user.business_id, dateFrom, dateTo, 5);
  const weekly = await getWeeklyReport(db, user.business_id);
  const busiest = await getBusiestSlot(db, user.business_id, 14);

  return NextResponse.json({
    business_name: businessRow?.business_name ?? "Warung",
    today: daily,
    trend_14d: trend,
    top_products_14d: topProducts,
    week: weekly,
    busiest_slot: busiest,
    generated_at: new Date().toISOString(),
  });
}
