import { Db } from "./db";

// CATATAN PORTING (baca ini sebelum ubah query di file ini):
//
// 1. COUNT(*) di Postgres balik sebagai BIGINT, dan driver `pg` mengembalikan
//    BIGINT sebagai STRING (bukan number JS) untuk menghindari kehilangan
//    presisi di angka sangat besar. Kalau dibiarkan, `row.orders` akan jadi
//    "25" bukan 25, dan `revenue / orders` di bawah akan pecah diam-diam.
//    Makanya SETIAP `COUNT(*)` di file ini di-cast eksplisit `::int` di SQL.
//
// 2. `strftime('%w', ...)` dan `substr(...)` itu fungsi SQLite, tidak ada di
//    Postgres. Diganti EXTRACT(DOW FROM ...::date) dan substring(... from .. for ..).

/** The entire metric contract: only ACTIVE transactions count. */
export async function getDailyMetrics(db: Db, business_id: string, date: string) {
  const row = (await db.get(
    `SELECT COUNT(*)::int as orders, COALESCE(SUM(total_amount), 0) as revenue
       FROM transactions
       WHERE business_id = $1 AND status = 'ACTIVE' AND transaction_date = $2`,
    [business_id, date]
  )) as { orders: number; revenue: number };

  const aov = row.orders > 0 ? round2(row.revenue / row.orders) : 0;
  return { date, orders: row.orders, revenue: round2(row.revenue), aov };
}

export async function getNeedsReviewQueue(db: Db, business_id: string) {
  return db.all(
    `SELECT row_id, transaction_date, transaction_time, total_amount, validation_notes, created_at
       FROM transactions
       WHERE business_id = $1 AND status = 'NEEDS_REVIEW'
       ORDER BY created_at ASC`,
    [business_id]
  );
}

export async function getPendingDuplicateFlags(db: Db, business_id: string) {
  return db.all(
    `SELECT flag_id, transaction_row_id, candidate_row_id, match_score, matched_fields
       FROM duplicate_flags
       WHERE business_id = $1 AND resolution_status = 'PENDING'`,
    [business_id]
  );
}

/** Full lineage: metric -> transaction -> line items -> source file. */
export async function getLineage(db: Db, row_id: string) {
  const txn = await db.get(`SELECT * FROM transactions WHERE row_id = $1`, [row_id]);
  const lines = await db.all(`SELECT * FROM transaction_lines WHERE transaction_row_id = $1`, [row_id]);
  const source = await db.get(
    `SELECT s.* FROM sources s JOIN transactions t ON t.source_id = s.source_id WHERE t.row_id = $1`,
    [row_id]
  );
  return { transaction: txn, lines, source };
}

export async function getVersionHistory(db: Db, transaction_id: string) {
  return db.all(
    `SELECT version, status, total_amount, created_at, resolved_at
       FROM transactions
       WHERE transaction_id = $1
       ORDER BY version ASC`,
    [transaction_id]
  );
}

/** Transactions page listing: current-state view — one row per
 * transaction_id, showing whichever version is "now true" (ACTIVE) or,
 * if voided, the VOID row itself. SUPERSEDED rows are intentionally
 * excluded here (they only surface via version history / lineage),
 * so the list always matches what the metrics actually count. */
export async function listTransactions(db: Db, business_id: string, date?: string) {
  const dateFilter = date ? `AND transaction_date = $2` : "";
  const params = date ? [business_id, date] : [business_id];
  return db.all(
    `SELECT row_id, transaction_id, version, transaction_date, transaction_time,
              total_amount, line_item_count, status, created_at, resolved_at
       FROM transactions
       WHERE business_id = $1 AND status IN ('ACTIVE', 'NEEDS_REVIEW', 'VOID') ${dateFilter}
       ORDER BY transaction_date DESC, transaction_time DESC`,
    params
  );
}

/** Whether a transaction currently has any correction history — used by
 * the UI to decide whether to show a "Dikoreksi" badge + "Lihat riwayat". */
export async function hasCorrectionHistory(db: Db, transaction_id: string): Promise<boolean> {
  const row = (await db.get(
    `SELECT COUNT(*)::int as n FROM transaction_events WHERE transaction_id = $1 AND event_type = 'CORRECTION'`,
    [transaction_id]
  )) as { n: number };
  return row.n > 0;
}

/** Data Inbox: recent file uploads with their processing status — the
 * answer to "did my file get in?" per SPEC.md §8. Failed uploads never
 * disappear; they stay here with a reason, ready for re-upload. */
export async function getDataInbox(db: Db, business_id: string, limit = 20) {
  return db.all(
    `SELECT source_id, original_filename, status, failure_reason,
              row_count, processed_row_count, uploaded_at
       FROM sources
       WHERE business_id = $1
       ORDER BY uploaded_at DESC
       LIMIT $2`,
    [business_id, limit]
  );
}

/** Top products by quantity sold (ACTIVE transactions only), for a given
 * date or date range. Matches the response shape the old n8n workflow's
 * "Susun Jawaban Teks" node already expects: [{produk, qty_terjual}]. */
async function getTopProducts(db: Db, business_id: string, dateFrom: string, dateTo: string, limit = 3) {
  const rows = (await db.all(
    `SELECT tl.product_or_service AS produk, SUM(tl.quantity) AS qty_terjual
       FROM transaction_lines tl
       JOIN transactions t ON t.row_id = tl.transaction_row_id
       WHERE t.business_id = $1 AND t.status = 'ACTIVE'
         AND t.transaction_date BETWEEN $2 AND $3
       GROUP BY tl.product_or_service
       ORDER BY qty_terjual DESC
       LIMIT $4`,
    [business_id, dateFrom, dateTo, limit]
  )) as { produk: string; qty_terjual: number }[];
  return rows.map((r) => ({ produk: r.produk, qty_terjual: Math.round(r.qty_terjual) }));
}

/** Daily report — same response shape as the old Python API's
 * `laporan-harian` (tanggal, total_revenue, total_orders, aov, top_produk)
 * so existing n8n WhatsApp-QA logic can point here with only a URL change. */
export async function getDailyReport(db: Db, business_id: string, date: string) {
  const m = await getDailyMetrics(db, business_id, date);
  return {
    tanggal: date,
    total_revenue: m.revenue,
    total_orders: m.orders,
    aov: m.aov,
    top_produk: await getTopProducts(db, business_id, date, date, 3),
  };
}

/** Weekly report — trailing 7 days ending on the latest ACTIVE transaction
 * date (falls back to today if there's no data yet), matching the old
 * `laporan-mingguan` shape (periode, total_revenue, total_orders, aov,
 * top_produk). */
export async function getWeeklyReport(db: Db, business_id: string) {
  const latest = (await db.get(
    `SELECT MAX(transaction_date) as d FROM transactions WHERE business_id = $1 AND status = 'ACTIVE'`,
    [business_id]
  )) as { d: string | null };
  const dateTo = latest.d ?? new Date().toISOString().slice(0, 10);
  const dateFrom = shiftDate(dateTo, -6);

  const row = (await db.get(
    `SELECT COUNT(*)::int as orders, COALESCE(SUM(total_amount), 0) as revenue
       FROM transactions
       WHERE business_id = $1 AND status = 'ACTIVE' AND transaction_date BETWEEN $2 AND $3`,
    [business_id, dateFrom, dateTo]
  )) as { orders: number; revenue: number };

  const aov = row.orders > 0 ? round2(row.revenue / row.orders) : 0;

  return {
    periode: `${dateFrom} s/d ${dateTo}`,
    total_revenue: round2(row.revenue),
    total_orders: row.orders,
    aov,
    top_produk: await getTopProducts(db, business_id, dateFrom, dateTo, 3),
  };
}

/** Tren pendapatan harian untuk `days` hari terakhir (default 14), rapat
 * sampai tanggal terbaru yang punya data ACTIVE (bukan selalu "hari ini",
 * supaya grafik tidak berakhir di angka 0 kalau belum ada transaksi hari
 * ini). Tanggal yang tidak punya transaksi tetap muncul dengan revenue: 0
 * (zero-filled) supaya barnya tidak bolong di grafik. */
export async function getDailyTrend(db: Db, business_id: string, days = 14) {
  const latest = (await db.get(
    `SELECT MAX(transaction_date) as d FROM transactions WHERE business_id = $1 AND status = 'ACTIVE'`,
    [business_id]
  )) as { d: string | null };
  const dateTo = latest.d ?? new Date().toISOString().slice(0, 10);
  const dateFrom = shiftDate(dateTo, -(days - 1));

  const rows = (await db.all(
    `SELECT transaction_date as date, COALESCE(SUM(total_amount), 0) as revenue,
              COUNT(*)::int as orders
       FROM transactions
       WHERE business_id = $1 AND status = 'ACTIVE' AND transaction_date BETWEEN $2 AND $3
       GROUP BY transaction_date`,
    [business_id, dateFrom, dateTo]
  )) as { date: string; revenue: number; orders: number }[];

  const byDate = new Map(rows.map((r) => [r.date, r]));
  const out: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 0; i < days; i++) {
    const date = shiftDate(dateFrom, i);
    const found = byDate.get(date);
    out.push({ date, revenue: found ? round2(found.revenue) : 0, orders: found?.orders ?? 0 });
  }
  return out;
}

/** Sama seperti getTopProducts (private), tapi diekspor supaya bisa dipakai
 * untuk rentang custom (mis. 14 hari) di luar laporan harian/mingguan. */
export async function getTopProductsInRange(
  db: Db,
  business_id: string,
  dateFrom: string,
  dateTo: string,
  limit = 5
) {
  return getTopProducts(db, business_id, dateFrom, dateTo, limit);
}

/** "Catatan toko": hari dan jam paling ramai (berdasarkan jumlah transaksi)
 * dalam `days` hari terakhir. Return null kalau data terlalu sedikit untuk
 * disimpulkan (< 5 transaksi) -- supaya UI tidak menampilkan insight palsu
 * dari 1-2 data point saja. */
export async function getBusiestSlot(db: Db, business_id: string, days = 14) {
  const latest = (await db.get(
    `SELECT MAX(transaction_date) as d FROM transactions WHERE business_id = $1 AND status = 'ACTIVE'`,
    [business_id]
  )) as { d: string | null };
  if (!latest.d) return null;
  const dateTo = latest.d;
  const dateFrom = shiftDate(dateTo, -(days - 1));

  const totalRow = (await db.get(
    `SELECT COUNT(*)::int as n FROM transactions
       WHERE business_id = $1 AND status = 'ACTIVE' AND transaction_date BETWEEN $2 AND $3`,
    [business_id, dateFrom, dateTo]
  )) as { n: number };
  if (totalRow.n < 5) return null;

  // EXTRACT(DOW ...): 0=Minggu, 1=Senin, ... 6=Sabtu -- sama persis dengan
  // konvensi strftime('%w') di SQLite, jadi tabel HARI di bawah tetap valid.
  const dayRow = (await db.get(
    `SELECT EXTRACT(DOW FROM transaction_date::date)::int as dow, COUNT(*)::int as n
       FROM transactions
       WHERE business_id = $1 AND status = 'ACTIVE' AND transaction_date BETWEEN $2 AND $3
       GROUP BY dow ORDER BY n DESC LIMIT 1`,
    [business_id, dateFrom, dateTo]
  )) as { dow: number; n: number } | undefined;

  const hourRow = (await db.get(
    `SELECT substring(transaction_time from 1 for 2) as hour, COUNT(*)::int as n
       FROM transactions
       WHERE business_id = $1 AND status = 'ACTIVE' AND transaction_date BETWEEN $2 AND $3
         AND transaction_time IS NOT NULL
       GROUP BY hour ORDER BY n DESC LIMIT 1`,
    [business_id, dateFrom, dateTo]
  )) as { hour: string; n: number } | undefined;

  if (!dayRow) return null;
  const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const hourNum = hourRow ? Number(hourRow.hour) : null;

  return {
    day: HARI[dayRow.dow],
    hour_start: hourNum !== null ? `${String(hourNum).padStart(2, "0")}:00` : null,
    hour_end: hourNum !== null ? `${String((hourNum + 1) % 24).padStart(2, "0")}:00` : null,
  };
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
