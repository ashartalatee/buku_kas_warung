// Copy to: app/api/transactions/route.ts
// GET /api/transactions?date=2026-08-20 (date optional)

import { NextRequest, NextResponse } from "next/server";
import { listTransactions, hasCorrectionHistory } from "@/lib/talatee-core/metrics";
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? undefined;
  const user = getCurrentUser();
  const db = getDb();

  const rows = (await listTransactions(db, user.business_id, date)) as any[];
  // Catatan porting: hasCorrectionHistory sekarang async (query Postgres),
  // jadi rows.map(...) biasa akan menghasilkan array of Promise, bukan
  // array hasil. Wajib Promise.all supaya benar-benar menunggu semuanya.
  const withHistoryFlag = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      was_corrected: await hasCorrectionHistory(db, r.transaction_id),
    }))
  );

  return NextResponse.json(withHistoryFlag);
}
