// Copy to: app/api/transactions/route.ts
// GET /api/transactions?date=2026-08-20 (date optional)

import { NextRequest, NextResponse } from "next/server";
import { listTransactions, hasCorrectionHistory } from "@/lib/talatee-core/metrics"; // adjust path
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? undefined;
  const user = getCurrentUser();
  const db = getDb();

  const rows = listTransactions(db, user.business_id, date) as any[];
  const withHistoryFlag = rows.map((r) => ({
    ...r,
    was_corrected: hasCorrectionHistory(db, r.transaction_id),
  }));

  return NextResponse.json(withHistoryFlag);
}
