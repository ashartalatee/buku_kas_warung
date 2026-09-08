// Copy to: app/api/products/[productId]/history/route.ts
// GET /api/products/{productId}/history -- riwayat penyesuaian stok
// (terbaru dulu), untuk audit trail di UI ("Lihat riwayat stok").

import { NextRequest, NextResponse } from "next/server";
import { getStockHistory, ProductError } from "@/lib/talatee-core/products";
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const user = getCurrentUser();
  const db = getDb();

  try {
    const history = await getStockHistory(db, productId, user.business_id);
    return NextResponse.json(history);
  } catch (err) {
    if (err instanceof ProductError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
