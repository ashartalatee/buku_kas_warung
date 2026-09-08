// Copy to: app/api/products/route.ts
// GET  /api/products             -- daftar produk aktif
// GET  /api/products?all=1       -- termasuk yang diarsipkan
// POST /api/products             -- buat produk baru

import { NextRequest, NextResponse } from "next/server";
import { listProducts, createProduct, ProductError } from "@/lib/talatee-core/products";
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";

export async function GET(req: NextRequest) {
  const user = getCurrentUser();
  const db = getDb();
  const includeInactive = req.nextUrl.searchParams.get("all") === "1";
  const products = await listProducts(db, user.business_id, { includeInactive });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  const db = getDb();
  const body = await req.json();

  try {
    const product = await createProduct(
      db,
      user.business_id,
      {
        name: body.name,
        category: body.category,
        unit: body.unit,
        price: body.price !== undefined && body.price !== "" ? Number(body.price) : null,
        low_stock_threshold:
          body.low_stock_threshold !== undefined && body.low_stock_threshold !== ""
            ? Number(body.low_stock_threshold)
            : null,
        initial_stock: body.initial_stock !== undefined ? Number(body.initial_stock) : undefined,
      },
      user.user_identifier
    );
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    if (err instanceof ProductError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
