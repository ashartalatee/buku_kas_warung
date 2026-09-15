// GET /api/reports/overview
//
// Menggabungkan semua data yang dibutuhkan halaman dashboard client
// (app/dashboard/page.tsx) jadi 1 request: ringkasan omzet per periode
// (hari/minggu/bulan/triwulan/tahun), tren 14 hari, omzet per channel
// (bulan berjalan), top 5 produk 14 hari, dan insight jam/hari tersibuk.
//
// 12 Sept 2026: tambah `periods` (triwulan) dan `channels` -- sebelumnya
// dashboard publik cuma punya "hari ini" berdiri sendiri, yang terasa
// kosong kalau kebetulan belum ada transaksi hari itu. Sekarang angka
// besar (kumulatif) ditampilkan berdampingan dengan angka kecil, supaya
// tidak ada 1 angka kosong yang berdiri sendirian di posisi mencolok.

import { NextResponse } from "next/server";
import {
  getDailyMetrics,
  getDailyTrend,
  getTopProductsInRange,
  getWeeklyReport,
  getBusiestSlot,
  getRevenueSummaryPeriods,
  getRevenueByChannel,
  getPeriodBounds,
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
  const periods = await getRevenueSummaryPeriods(db, user.business_id);

  const monthBounds = getPeriodBounds("month");
  const channels = await getRevenueByChannel(db, user.business_id, monthBounds.dateFrom, monthBounds.dateTo);

  return NextResponse.json({
    business_name: businessRow?.business_name ?? "Warung",
    today: daily,
    trend_14d: trend,
    top_products_14d: topProducts,
    week: weekly,
    periods,
    channels,
    busiest_slot: busiest,
    generated_at: new Date().toISOString(),
  });
}