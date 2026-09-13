// Copy to: app/api/settings/change-password/route.ts
//
// Diproteksi sama seperti /api/products, /api/transactions, dll: wajib
// cookie sesi (proxy.ts, jalur default untuk route yang tidak ada di
// N8N_ROUTES/SHARE_LINK_ROUTES/PUBLIC_ROUTES) -- tidak perlu perubahan
// apa pun di proxy.ts.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../_lib/session";
import { getDb } from "../../_lib/db";
import { hashPassword, verifyPassword } from "@/lib/talatee-core/password";

export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  const db = getDb();

  let body: { current_password?: string; new_password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body request tidak valid." }, { status: 400 });
  }

  if (!body.current_password || !body.new_password) {
    return NextResponse.json({ error: "Password saat ini dan password baru wajib diisi." }, { status: 400 });
  }
  if (body.new_password.length < 6) {
    return NextResponse.json({ error: "Password baru minimal 6 karakter." }, { status: 400 });
  }

  const row = (await db.get(`SELECT password_hash FROM businesses WHERE business_id = $1`, [user.business_id])) as
    | { password_hash: string | null }
    | undefined;

  if (!row || !verifyPassword(body.current_password, row.password_hash)) {
    return NextResponse.json({ error: "Password saat ini salah." }, { status: 401 });
  }

  const newHash = hashPassword(body.new_password);
  await db.run(`UPDATE businesses SET password_hash = $1 WHERE business_id = $2`, [newHash, user.business_id]);

  return NextResponse.json({ ok: true });
}
