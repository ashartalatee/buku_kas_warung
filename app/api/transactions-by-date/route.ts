// Copy to: app/api/transactions-by-date/route.ts
// GET ?date=2026-09-11 -- detail semua transaksi di 1 tanggal.
import { NextRequest, NextResponse } from "next/server";
import { getTransactionsByDate } from "@/lib/talatee-core/calendar";
import { getDb } from "../_lib/db";
import { getCurrentUser } from "../_lib/session";

export async function GET(req: NextRequest) {
  const user = getCurrentUser();
  const db = getDb();

  const date = req.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Parameter date tidak valid (format: YYYY-MM-DD)." }, { status: 400 });
  }

  try {
    const transactions = await getTransactionsByDate(db, user.business_id, date);
    return NextResponse.json({ transactions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Gagal memuat transaksi tanggal ini." }, { status: 500 });
  }
}
