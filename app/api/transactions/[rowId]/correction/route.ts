// Copy to: app/api/transactions/[rowId]/correction/route.ts
//
// Corrects an ACTIVE transaction — creates a new version, old version
// -> SUPERSEDED. Per SPEC.md §9, WA-originated corrections require an
// explicit confirm step BEFORE this endpoint is called; this endpoint
// itself always executes immediately once called (the confirmation UX
// lives client-side / in the WhatsApp bot flow, not here).
//
// On a concurrent-correction conflict, returns 409 with the message
// from lifecycle.ts. SPEC.md §13 calls for a richer message (who
// changed it, to what value) — that enrichment isn't built into
// lifecycle.ts yet; see core/README.md "Known simplification."

import { NextRequest, NextResponse } from "next/server";
import { createCorrection, LifecycleError } from "@/lib/talatee-core/lifecycle"; // adjust path
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";
import { CorrectionReason } from "@/lib/talatee-core/types"; // adjust path

const VALID_REASONS: CorrectionReason[] = [
  "Salah input",
  "OCR salah membaca",
  "Duplikat",
  "Transaksi dibatalkan",
  "Harga salah",
  "Qty salah",
  "Tanggal salah",
  "Lainnya",
];

export async function POST(req: NextRequest, { params }: { params: Promise<{ rowId: string }> }) {
  const { rowId } = await params;
  const body = await req.json();
  const user = getCurrentUser();
  const db = getDb();

  if (!VALID_REASONS.includes(body.reason)) {
    return NextResponse.json(
      { error: `reason harus salah satu dari: ${VALID_REASONS.join(", ")}` },
      { status: 400 }
    );
  }
  if (body.reason === "Lainnya" && !body.reason_detail) {
    return NextResponse.json(
      { error: "reason_detail wajib diisi ketika reason = 'Lainnya'." },
      { status: 400 }
    );
  }

  try {
    const result = createCorrection(
      db,
      rowId,
      { total_amount: body.total_amount },
      body.reason,
      body.reason_detail ?? null,
      user.user_identifier
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LifecycleError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
