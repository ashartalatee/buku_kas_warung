// Copy to: app/api/products/[productId]/purge/route.ts
// DELETE /api/products/{productId}/purge -- hapus produk PERMANEN. Rute
// terpisah dari DELETE /api/products/{productId} (yang cuma arsipkan) --
// cuma berhasil kalau produknya sudah diarsipkan (is_active = false).

import { NextRequest, NextResponse } from "next/server";
import { hardDeleteProduct, ProductError } from "@/lib/talatee-core/products";
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const user = getCurrentUser();
  const db = getDb();

  try {
    await hardDeleteProduct(db, productId, user.business_id);
    return NextResponse.json({ product_id: productId, permanently_deleted: true });
  } catch (err) {
    if (err instanceof ProductError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
