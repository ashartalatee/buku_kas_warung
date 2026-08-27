// Copy to: app/api/transactions/[rowId]/lineage/route.ts
// Backs the "Lihat riwayat" / lineage view described in SPEC.md §11.

import { NextRequest, NextResponse } from "next/server";
import { getLineage, getVersionHistory } from "@/lib/talatee-core/metrics"; // adjust path
import { getDb } from "@/app/api/_lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ rowId: string }> }) {
  const { rowId } = await params;
  const db = getDb();
  const lineage = getLineage(db, rowId);

  if (!lineage.transaction) {
    return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
  }

  const transaction_id = (lineage.transaction as any).transaction_id;
  const history = getVersionHistory(db, transaction_id);

  return NextResponse.json({ ...lineage, version_history: history });
}
