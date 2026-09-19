// Copy to: app/api/ops/clients/[businessId]/toggle-active/route.ts
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

  const biz = (await db.get(`SELECT business_name FROM businesses WHERE business_id = $1`, [
    businessId,
  ])) as { business_name: string } | undefined;

  await db.run(`UPDATE businesses SET is_active = $1 WHERE business_id = $2`, [isActive, businessId]);

  await db.run(
    `INSERT INTO admin_audit_log (action, target_business_id, target_business_name, performed_by)
     VALUES ($1, $2, $3, 'platform_admin')`,
    [isActive ? "ACTIVATE" : "DEACTIVATE", businessId, biz?.business_name ?? businessId]
  );

  return NextResponse.json({ ok: true, is_active: isActive });
}
