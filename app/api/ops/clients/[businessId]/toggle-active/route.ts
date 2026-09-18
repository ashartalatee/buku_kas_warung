// Copy to: app/api/ops/clients/[businessId]/toggle-active/route.ts
//
// Nonaktifkan/aktifkan client -- REVERSIBEL. Client nonaktif langsung
// ditolak di login (route.ts) DAN di setiap request lain (session.ts),
// tanpa perlu logout paksa manual -- lihat catatan di session.ts.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/api/_lib/session";
import { PLATFORM_ADMIN_SESSION_ID } from "@/app/api/_lib/auth";
import { getDb } from "@/app/api/_lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getCurrentUser();
  if (user.business_id !== PLATFORM_ADMIN_SESSION_ID) {
    return NextResponse.json({ error: "Hanya Platform Admin yang bisa akses ini." }, { status: 403 });
  }

  const { businessId } = await params;
  const body = await req.json();
  const isActive = Boolean(body.is_active);

  const db = getDb();
  await db.run(`UPDATE businesses SET is_active = $1 WHERE business_id = $2`, [isActive, businessId]);

  return NextResponse.json({ ok: true, is_active: isActive });
}
