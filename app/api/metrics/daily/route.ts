// Copy to: app/api/metrics/daily/route.ts
// GET /api/metrics/daily?date=2026-08-20

import { NextRequest, NextResponse } from "next/server";
import { getDailyMetrics } from "@/lib/talatee-core/metrics"; // adjust path after copying
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const user = getCurrentUser();
  const db = getDb();

  const metrics = getDailyMetrics(db, user.business_id, date);
  return NextResponse.json(metrics);
}
