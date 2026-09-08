// Copy to: app/api/products/[productId]/adjust-stock/route.ts
// POST /api/products/{productId}/adjust-stock
// body: { delta: number, reason: StockAdjustmentReason, reason_detail?: string }
//
// delta positif = stok masuk, negatif = stok keluar/terpakai. Satu-satunya
// jalur resmi untuk mengubah angka stok -- lihat products.ts:adjustStock().

import { NextRequest, NextResponse } from "next/server";
import { adjustStock, ProductError } from "@/lib/talatee-core/products";
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";
import { StockAdjustmentReason } from "@/lib/talatee-core/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const user = getCurrentUser();
  const db = getDb();
  const body = await req.json();

  const delta = Number(body.delta);
  if (isNaN(delta)) {
    return NextResponse.json({ error: "Jumlah penyesuaian harus berupa angka." }, { status: 400 });
  }
  const reason: StockAdjustmentReason = body.reason ?? "Lainnya";

  try {
    const product = await adjustStock(
      db,
      productId,
      user.business_id,
      delta,
      reason,
      body.reason_detail ?? null,
      user.user_identifier
    );
    return NextResponse.json(product);
  } catch (err) {
    if (err instanceof ProductError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
