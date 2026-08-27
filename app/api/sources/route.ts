// Copy to: app/api/sources/route.ts

import { NextResponse } from "next/server";
import { getDataInbox } from "@/lib/talatee-core/metrics"; // adjust path
import { getDb } from "@/app/api/_lib/db";
import { getCurrentUser } from "@/app/api/_lib/session";

export async function GET() {
  const user = getCurrentUser();
  const db = getDb();
  return NextResponse.json(getDataInbox(db, user.business_id));
}
