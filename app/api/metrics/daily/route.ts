// Copy to: app/api/metrics/daily/route.ts
// GET /api/metrics/daily?date=2026-08-20

import { NextRequest, NextResponse } from "next/server";
import { getDailyMetrics } from "@/lib/talatee-core/metrics";
import { getTodayLocalDate } from "@/lib/talatee-core/date-utils";
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? getTodayLocalDate();
  const user = await getCurrentUser();
  const db = getDb();

  const metrics = await getDailyMetrics(db, user.business_id, date);
  return NextResponse.json(metrics);
}
