// Copy to: app/api/transactions/[rowId]/void/route.ts
//
// Doubles as the backend for the "Tandai Duplikat" flow in SPEC.md §13
// when reason = "Duplikat" — voiding one of two ACTIVE transactions
// found to represent the same event. No separate endpoint needed for
// that case; the UI just calls this one with the right reason.

import { NextRequest, NextResponse } from "next/server";
import { voidTransaction, LifecycleError } from "@/lib/talatee-core/lifecycle"; // adjust path
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";
import { CorrectionReason } from "@/lib/talatee-core/types"; // adjust path

export async function POST(req: NextRequest, { params }: { params: Promise<{ rowId: string }> }) {
  const { rowId } = await params;
  const body = await req.json();
  const user = getCurrentUser();
  const db = getDb();

  const reason: CorrectionReason = body.reason ?? "Transaksi dibatalkan";

  try {
    const result = voidTransaction(db, rowId, reason, body.reason_detail ?? null, user.user_identifier);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LifecycleError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
