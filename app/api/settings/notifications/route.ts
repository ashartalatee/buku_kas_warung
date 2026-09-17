// Copy to: app/api/settings/notifications/route.ts
//
// v1 (12 Sept 2026): SATU pengaturan nyata -- ambang stok menipis default,
// dipakai untuk pre-fill field low_stock_threshold di form tambah produk
// baru (lihat ProductsList.tsx). Jadwal laporan otomatis WA/Telegram
// SENGAJA TIDAK ada di sini -- itu masih dikonfigurasi manual lewat n8n
// (Setup_waha_n8n.md), belum terhubung ke Settings ini. Jangan tambah
// toggle lain di endpoint ini kalau efeknya cuma tersimpan di database
// tapi tidak benar-benar dipakai di mana pun -- itu menyesatkan pengguna.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../_lib/session";
import { getDb } from "../../_lib/db";

export async function GET() {
  const user = await getCurrentUser();
  const db = getDb();
  const row = await db.get(`SELECT default_low_stock_threshold FROM businesses WHERE business_id = $1`, [
    user.business_id,
  ]);
  return NextResponse.json(row ?? { default_low_stock_threshold: null });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  const db = getDb();

  let body: { default_low_stock_threshold?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body request tidak valid." }, { status: 400 });
  }

  const value =
    body.default_low_stock_threshold === null || body.default_low_stock_threshold === undefined
      ? null
      : Number(body.default_low_stock_threshold);

  if (value !== null && (!Number.isFinite(value) || value < 0)) {
    return NextResponse.json({ error: "Ambang stok tidak valid." }, { status: 400 });
  }

  await db.run(`UPDATE businesses SET default_low_stock_threshold = $1 WHERE business_id = $2`, [
    value,
    user.business_id,
  ]);

  return NextResponse.json({ ok: true });
}
