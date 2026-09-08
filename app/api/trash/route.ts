// Copy to: app/api/trash/route.ts
// GET /api/trash -- daftar semua yang ada di Sampah (transaksi individual
// + batch upload), dipakai halaman /trash.

import { NextResponse } from "next/server";
import { listTrashTransactions, listTrashSources } from "@/lib/talatee-core/metrics";
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";

export async function GET() {
  const user = getCurrentUser();
  const db = getDb();

  const [transactions, sources] = await Promise.all([
    listTrashTransactions(db, user.business_id),
    listTrashSources(db, user.business_id),
  ]);

  return NextResponse.json({ transactions, sources });
}
