// Copy to: lib/talatee-core/calendar.ts
//
// Data buat kalender transaksi di Panel Sederhana (12 Sept 2026): ringkasan
// per bulan (tanggal mana saja yang ada transaksi, buat titik penanda di
// kalender) + detail transaksi 1 tanggal tertentu (buat ditampilkan
// per-channel setelah tanggal diklik). Status difilter 'ACTIVE' saja --
// konsisten dengan semua laporan lain di app ini (VOID/NEEDS_REVIEW tidak
// ikut dihitung sebagai omzet).

export interface CalendarDaySummary {
  date: string;
  count: number;
  revenue: number;
}

export interface DayTransactionLine {
  product_or_service: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface DayTransaction {
  row_id: string;
  transaction_date: string;
  transaction_time: string | null;
  total_amount: number;
  channel: string;
  lines: DayTransactionLine[];
}

export async function getMonthSummary(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  businessId: string,
  year: number,
  month: number // 1-12
): Promise<CalendarDaySummary[]> {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const to = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const rows = (await db.all(
    `SELECT transaction_date, COUNT(*)::int as count, COALESCE(SUM(total_amount), 0) as revenue
       FROM transactions
      WHERE business_id = $1 AND status = 'ACTIVE' AND deleted_at IS NULL
        AND transaction_date >= $2 AND transaction_date < $3
      GROUP BY transaction_date`,
    [businessId, from, to]
  )) as { transaction_date: string; count: number; revenue: number }[];

  return rows.map((r) => ({ date: r.transaction_date, count: r.count, revenue: Number(r.revenue) }));
}

export async function getTransactionsByDate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  businessId: string,
  date: string
): Promise<DayTransaction[]> {
  const txnRows = (await db.all(
    `SELECT row_id, transaction_date, transaction_time, total_amount, channel
       FROM transactions
      WHERE business_id = $1 AND transaction_date = $2 AND status = 'ACTIVE' AND deleted_at IS NULL
      ORDER BY transaction_time ASC NULLS LAST`,
    [businessId, date]
  )) as Omit<DayTransaction, "lines">[];

  if (txnRows.length === 0) return [];

  // Baris produk/jasa per transaksi -- ditampilkan APA ADANYA persis
  // seperti yang diupload (tidak ada pembersihan/normalisasi nama
  // produk di sini), konsisten dengan prinsip "jangan diam-diam ubah
  // data" yang sudah dipegang di seluruh app ini.
  const rowIds = txnRows.map((r) => r.row_id);
  const lineRows = (await db.all(
    `SELECT transaction_row_id, product_or_service, quantity, unit_price, subtotal
       FROM transaction_lines
      WHERE transaction_row_id = ANY($1::text[])`,
    [rowIds]
  )) as { transaction_row_id: string; product_or_service: string; quantity: number; unit_price: number; subtotal: number }[];

  const linesByTxn: Record<string, DayTransactionLine[]> = {};
  for (const l of lineRows) {
    (linesByTxn[l.transaction_row_id] ||= []).push({
      product_or_service: l.product_or_service,
      quantity: l.quantity,
      unit_price: l.unit_price,
      subtotal: l.subtotal,
    });
  }

  return txnRows.map((r) => ({ ...r, lines: linesByTxn[r.row_id] ?? [] }));
}
