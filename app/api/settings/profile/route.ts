// Copy to: app/api/settings/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../_lib/session";
import { getDb } from "../../_lib/db";

const BUSINESS_TYPES = ["warung", "laundry", "bengkel"];

export async function GET() {
  const user = await getCurrentUser();
  const db = getDb();
  const row = await db.get(
    `SELECT business_name, business_type, address, phone FROM businesses WHERE business_id = $1`,
    [user.business_id]
  );
  if (!row) return NextResponse.json({ error: "Business tidak ditemukan." }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  const db = getDb();

  let body: { business_name?: string; business_type?: string; address?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body request tidak valid." }, { status: 400 });
  }

  if (!body.business_name || !body.business_name.trim()) {
    return NextResponse.json({ error: "Nama warung wajib diisi." }, { status: 400 });
  }
  if (body.business_type && !BUSINESS_TYPES.includes(body.business_type)) {
    return NextResponse.json({ error: "Jenis usaha tidak valid." }, { status: 400 });
  }

  await db.run(
    `UPDATE businesses SET business_name = $1, business_type = COALESCE($2, business_type), address = $3, phone = $4 WHERE business_id = $5`,
    [body.business_name.trim(), body.business_type ?? null, body.address || null, body.phone || null, user.business_id]
  );

  return NextResponse.json({ ok: true });
}
