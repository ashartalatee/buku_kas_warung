// Copy to: app/api/products/[productId]/route.ts
// PATCH  /api/products/{productId}  -- edit nama/kategori/satuan/harga/ambang stok
// DELETE /api/products/{productId}  -- arsipkan (soft delete, bukan hapus permanen)

import { NextRequest, NextResponse } from "next/server";
import { updateProduct, archiveProduct, reactivateProduct, ProductError } from "@/lib/talatee-core/products";
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const user = await getCurrentUser();
  const db = getDb();
  const body = await req.json();

  try {
    // Reaktivasi produk yang tadinya diarsipkan -- jalur terpisah dari edit
    // metadata biasa karena logikanya beda (cek tabrakan nama aktif lain).
    if (body.is_active === true) {
      const product = await reactivateProduct(db, productId, user.business_id);
      return NextResponse.json(product);
    }

    const product = await updateProduct(db, productId, user.business_id, {
      name: body.name,
      category: "category" in body ? body.category : undefined,
      unit: body.unit,
      price: "price" in body ? (body.price === "" ? null : Number(body.price)) : undefined,
      low_stock_threshold:
        "low_stock_threshold" in body
          ? body.low_stock_threshold === ""
            ? null
            : Number(body.low_stock_threshold)
          : undefined,
    });
    return NextResponse.json(product);
  } catch (err) {
    if (err instanceof ProductError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const user = await getCurrentUser();
  const db = getDb();

  try {
    await archiveProduct(db, productId, user.business_id);
    return NextResponse.json({ product_id: productId, is_active: false });
  } catch (err) {
    if (err instanceof ProductError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
