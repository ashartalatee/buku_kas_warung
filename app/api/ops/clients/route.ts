// Copy to: app/api/ops/clients/route.ts
//
// CRUD sederhana untuk kelola business/client -- CUMA Platform Admin.
// POST: bikin client baru, return password plaintext SEKALI SAJA.
// GET: daftar semua client (termasuk is_active, supaya UI bisa tampilkan
// status Aktif/Nonaktif dan tombol yang sesuai).

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/app/api/_lib/session";
import { PLATFORM_ADMIN_SESSION_ID } from "@/app/api/_lib/auth";
import { hashPassword } from "@/lib/talatee-core/password";
import { getDb } from "@/app/api/_lib/db";

async function requirePlatformAdmin() {
  const user = await getCurrentUser();
  if (user.business_id !== PLATFORM_ADMIN_SESSION_ID) {
    throw new Error("FORBIDDEN");
  }
}

function randomPassword(): string {
  return randomBytes(6).toString("hex");
}

export async function GET() {
  try {
    await requirePlatformAdmin();
  } catch {
    return NextResponse.json({ error: "Hanya Platform Admin yang bisa akses ini." }, { status: 403 });
  }

  const db = getDb();
  const rows = await db.all(
    `SELECT business_id, business_name, business_type, is_active, created_at,
            (SELECT COUNT(*)::int FROM transactions t WHERE t.business_id = businesses.business_id) as transaction_count
       FROM businesses
      WHERE password_hash IS NOT NULL
      ORDER BY created_at DESC`
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin();
  } catch {
    return NextResponse.json({ error: "Hanya Platform Admin yang bisa akses ini." }, { status: 403 });
  }

  const body = await req.json();
  const name = String(body.business_name ?? "").trim();
  const type = String(body.business_type ?? "");

  if (!name) {
    return NextResponse.json({ error: "Nama client wajib diisi." }, { status: 400 });
  }
  if (!["warung", "laundry", "bengkel", "marketplace"].includes(type)) {
    return NextResponse.json({ error: "Jenis usaha tidak valid." }, { status: 400 });
  }

  const password = randomPassword();
  const hash = hashPassword(password);

  const db = getDb();
  const row = (await db.get(
    `INSERT INTO businesses (business_name, business_type, password_hash)
     VALUES ($1, $2, $3)
     RETURNING business_id`,
    [name, type, hash]
  )) as { business_id: string };

  return NextResponse.json({
    business_id: row.business_id,
    business_name: name,
    password,
    login_url: `/login?biz=${row.business_id}`,
  });
}
