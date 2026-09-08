// Copy to: app/api/revenue-summary/route.ts
// GET /api/revenue-summary -- omzet hari ini/minggu ini/bulan ini/tahun
// ini (semua "to date"), dipakai RevenueHero.tsx di paling atas Overview.

import { NextResponse } from "next/server";
import { getRevenueSummaryPeriods } from "@/lib/talatee-core/metrics";
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";

export async function GET() {
  const user = getCurrentUser();
  const db = getDb();
  const summary = await getRevenueSummaryPeriods(db, user.business_id);
  return NextResponse.json(summary);
}
