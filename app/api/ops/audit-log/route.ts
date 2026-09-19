// Copy to: app/api/ops/audit-log/route.ts
// GET -- 50 aksi admin terbaru terhadap client (create/nonaktifkan/
// aktifkan/hapus). CUMA Platform Admin.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/api/_lib/session";
import { PLATFORM_ADMIN_SESSION_ID } from "@/app/api/_lib/auth";
import { getDb } from "@/app/api/_lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (user.business_id !== PLATFORM_ADMIN_SESSION_ID) {
    return NextResponse.json({ error: "Hanya Platform Admin yang bisa akses ini." }, { status: 403 });
  }

  const db = getDb();
  const rows = await db.all(
    `SELECT log_id, action, target_business_name, performed_by, created_at
       FROM admin_audit_log
      ORDER BY created_at DESC
      LIMIT 50`
  );
  return NextResponse.json(rows);
}
