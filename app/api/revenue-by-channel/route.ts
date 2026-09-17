// Copy to: app/api/revenue-by-channel/route.ts
// GET /api/revenue-by-channel?period=day|week|month|year (default: month)
// -- omzet dipecah per channel (Shopee/TikTok Shop/Lazada/WhatsApp/dst)
// untuk 1 periode "to date", plus total keseluruhan.

import { NextRequest, NextResponse } from "next/server";
import { getRevenueByChannel, getPeriodBounds } from "@/lib/talatee-core/metrics";
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";

const VALID_PERIODS = ["day", "week", "month", "year"] as const;
type Period = (typeof VALID_PERIODS)[number];

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const db = getDb();

  const periodParam = req.nextUrl.searchParams.get("period") ?? "month";
  const period: Period = (VALID_PERIODS as readonly string[]).includes(periodParam)
    ? (periodParam as Period)
    : "month";

  const { dateFrom, dateTo } = getPeriodBounds(period);
  const result = await getRevenueByChannel(db, user.business_id, dateFrom, dateTo);

  return NextResponse.json({ period, date_from: dateFrom, date_to: dateTo, ...result });
}
