// Copy to: app/api/activity/route.ts
//
// GET saja (read-only) -- diproteksi sama seperti /api/products, /api/
// transactions, dll: wajib cookie sesi (proxy.ts, jalur default untuk
// route yang tidak ada di N8N_ROUTES/SHARE_LINK_ROUTES/PUBLIC_ROUTES),
// tidak perlu perubahan apa pun di proxy.ts.

import { NextResponse } from "next/server";
import { getActivityFeed } from "@/lib/talatee-core/activity";
import { getDb } from "../_lib/db";
import { getCurrentUser } from "../_lib/session";

export async function GET() {
  const user = getCurrentUser();
  const db = getDb();

  try {
    const items = await getActivityFeed(db, user.business_id, 50);
    return NextResponse.json(items);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Gagal memuat activity log." }, { status: 500 });
  }
}
