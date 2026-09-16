// Copy to: app/api/transactions/route.ts
// GET /api/transactions?date=2026-08-20 (date optional)
// GET /api/transactions?source_id=xxx (opsional, lihat transaksi 1 file)
// Keduanya bisa dipakai bareng atau sendiri-sendiri.

import { NextRequest, NextResponse } from "next/server";
import { listTransactions, hasCorrectionHistory } from "@/lib/talatee-core/metrics";
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? undefined;
  const source_id = req.nextUrl.searchParams.get("source_id") ?? undefined;
  const user = getCurrentUser();
  const db = getDb();

  const rows = (await listTransactions(db, user.business_id, date, source_id)) as any[];
  const withHistoryFlag = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      was_corrected: await hasCorrectionHistory(db, r.transaction_id),
    }))
  );

  return NextResponse.json(withHistoryFlag);
}
