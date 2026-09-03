// Copy to: app/api/needs-review/route.ts

import { NextResponse } from "next/server";
import { getNeedsReviewQueue } from "@/lib/talatee-core/metrics";
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";

export async function GET() {
  const user = getCurrentUser();
  const db = getDb();
  return NextResponse.json(await getNeedsReviewQueue(db, user.business_id));
}
