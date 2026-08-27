// Copy to: app/api/reports/weekly/route.ts
//
// Same response shape as the old Flask API's /laporan-mingguan:
// { periode, total_revenue, total_orders, aov, top_produk: [...] }.

import { NextResponse } from "next/server";
import { getWeeklyReport } from "@/lib/talatee-core/metrics"; // adjust path
import { getDb } from "../../_lib/db";
import { getCurrentUser } from "../../_lib/session";

export async function GET() {
  const user = getCurrentUser();
  const db = getDb();
  return NextResponse.json(getWeeklyReport(db, user.business_id));
}
