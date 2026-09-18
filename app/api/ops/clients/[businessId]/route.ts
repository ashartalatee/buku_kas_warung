// Copy to: app/api/ops/clients/[businessId]/route.ts
//
// DELETE -- hapus client PERMANEN. Ditolak kalau client itu sudah punya
// transaksi tersimpan (sengaja fail-closed, supaya tidak ada yang
// kehapus tanpa sengaja) -- untuk client yang sudah pernah pakai tapi
// mau dihentikan, pakai Nonaktifkan (reversibel), BUKAN Hapus.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/api/_lib/session";
import { PLATFORM_ADMIN_SESSION_ID } from "@/app/api/_lib/auth";
import { getDb } from "@/app/api/_lib/db";

export async function DELETE(req: Request, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getCurrentUser();
  if (user.business_id !== PLATFORM_ADMIN_SESSION_ID) {
    return NextResponse.json({ error: "Hanya Platform Admin yang bisa akses ini." }, { status: 403 });
  }

  const { businessId } = await params;
  const db = getDb();

  const countRow = (await db.get(`SELECT COUNT(*)::int as n FROM transactions WHERE business_id = $1`, [
    businessId,
  ])) as { n: number };

  if (countRow.n > 0) {
    return NextResponse.json(
      {
        error: `Client ini punya ${countRow.n} transaksi tersimpan -- tidak bisa dihapus permanen. Pakai "Nonaktifkan" sebagai gantinya.`,
      },
      { status: 409 }
    );
  }

  await db.run(`DELETE FROM businesses WHERE business_id = $1`, [businessId]);
  return NextResponse.json({ ok: true });
}
