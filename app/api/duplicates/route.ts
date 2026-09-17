// Copy to: app/api/duplicates/route.ts

import { NextResponse } from "next/server";
import { getPendingDuplicateFlags } from "@/lib/talatee-core/metrics";
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";

export async function GET() {
  const user = await getCurrentUser();
  const db = getDb();
  return NextResponse.json(await getPendingDuplicateFlags(db, user.business_id));
}
