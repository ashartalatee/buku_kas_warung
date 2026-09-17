// Copy to: app/api/transactions-calendar/route.ts
// GET ?year=2026&month=9 -- ringkasan tanggal mana saja yang ada transaksi
// dalam 1 bulan, buat titik penanda di kalender.
import { NextRequest, NextResponse } from "next/server";
import { getMonthSummary } from "@/lib/talatee-core/calendar";
import { getDb } from "../_lib/db";
import { getCurrentUser } from "../_lib/session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const db = getDb();

  const year = Number(req.nextUrl.searchParams.get("year"));
  const month = Number(req.nextUrl.searchParams.get("month"));

  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "Parameter year/month tidak valid." }, { status: 400 });
  }

  try {
    const summary = await getMonthSummary(db, user.business_id, year, month);
    return NextResponse.json({ days: summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Gagal memuat ringkasan kalender." }, { status: 500 });
  }
}
