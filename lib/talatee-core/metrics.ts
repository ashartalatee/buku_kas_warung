import Database from "better-sqlite3";

/** The entire metric contract: only ACTIVE transactions count. */
export function getDailyMetrics(db: Database.Database, business_id: string, date: string) {
  const row = db
    .prepare(
      `SELECT COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as revenue
       FROM transactions
       WHERE business_id = ? AND status = 'ACTIVE' AND transaction_date = ?`
    )
    .get(business_id, date) as { orders: number; revenue: number };

  const aov = row.orders > 0 ? round2(row.revenue / row.orders) : 0;
  return { date, orders: row.orders, revenue: round2(row.revenue), aov };
}

export function getNeedsReviewQueue(db: Database.Database, business_id: string) {
  return db
    .prepare(
      `SELECT row_id, transaction_date, transaction_time, total_amount, validation_notes, created_at
       FROM transactions
       WHERE business_id = ? AND status = 'NEEDS_REVIEW'
       ORDER BY created_at ASC`
    )
    .all(business_id);
}

export function getPendingDuplicateFlags(db: Database.Database, business_id: string) {
  return db
    .prepare(
      `SELECT flag_id, transaction_row_id, candidate_row_id, match_score, matched_fields
       FROM duplicate_flags
       WHERE business_id = ? AND resolution_status = 'PENDING'`
    )
    .all(business_id);
}

/** Full lineage: metric -> transaction -> line items -> source file. */
export function getLineage(db: Database.Database, row_id: string) {
  const txn = db.prepare(`SELECT * FROM transactions WHERE row_id = ?`).get(row_id);
  const lines = db
    .prepare(`SELECT * FROM transaction_lines WHERE transaction_row_id = ?`)
    .all(row_id);
  const source = db
    .prepare(
      `SELECT s.* FROM sources s JOIN transactions t ON t.source_id = s.source_id WHERE t.row_id = ?`
    )
    .get(row_id);
  return { transaction: txn, lines, source };
}

export function getVersionHistory(db: Database.Database, transaction_id: string) {
  return db
    .prepare(
      `SELECT version, status, total_amount, created_at, resolved_at
       FROM transactions
       WHERE transaction_id = ?
       ORDER BY version ASC`
    )
    .all(transaction_id);
}

/** Transactions page listing: current-state view — one row per
 * transaction_id, showing whichever version is "now true" (ACTIVE) or,
 * if voided, the VOID row itself. SUPERSEDED rows are intentionally
 * excluded here (they only surface via version history / lineage),
 * so the list always matches what the metrics actually count. */
export function listTransactions(db: Database.Database, business_id: string, date?: string) {
  const dateFilter = date ? `AND transaction_date = ?` : "";
  const params = date ? [business_id, date] : [business_id];
  return db
    .prepare(
      `SELECT row_id, transaction_id, version, transaction_date, transaction_time,
              total_amount, line_item_count, status, created_at, resolved_at
       FROM transactions
       WHERE business_id = ? AND status IN ('ACTIVE', 'NEEDS_REVIEW', 'VOID') ${dateFilter}
       ORDER BY transaction_date DESC, transaction_time DESC`
    )
    .all(...params);
}

/** Whether a transaction currently has any correction history — used by
 * the UI to decide whether to show a "Dikoreksi" badge + "Lihat riwayat". */
export function hasCorrectionHistory(db: Database.Database, transaction_id: string): boolean {
  const row = db
    .prepare(
      `SELECT COUNT(*) as n FROM transaction_events WHERE transaction_id = ? AND event_type = 'CORRECTION'`
    )
    .get(transaction_id) as { n: number };
  return row.n > 0;
}

/** Data Inbox: recent file uploads with their processing status — the
 * answer to "did my file get in?" per SPEC.md §8. Failed uploads never
 * disappear; they stay here with a reason, ready for re-upload. */
export function getDataInbox(db: Database.Database, business_id: string, limit = 20) {
  return db
    .prepare(
      `SELECT source_id, original_filename, status, failure_reason,
              row_count, processed_row_count, uploaded_at
       FROM sources
       WHERE business_id = ?
       ORDER BY uploaded_at DESC
       LIMIT ?`
    )
    .all(business_id, limit);
}

/** Top products by quantity sold (ACTIVE transactions only), for a given
 * date or date range. Matches the response shape the old n8n workflow's
 * "Susun Jawaban Teks" node already expects: [{produk, qty_terjual}]. */
function getTopProducts(
  db: Database.Database,
  business_id: string,
  dateFrom: string,
  dateTo: string,
  limit = 3
) {
  const rows = db
    .prepare(
      `SELECT tl.product_or_service AS produk, SUM(tl.quantity) AS qty_terjual
       FROM transaction_lines tl
       JOIN transactions t ON t.row_id = tl.transaction_row_id
       WHERE t.business_id = ? AND t.status = 'ACTIVE'
         AND t.transaction_date BETWEEN ? AND ?
       GROUP BY tl.product_or_service
       ORDER BY qty_terjual DESC
       LIMIT ?`
    )
    .all(business_id, dateFrom, dateTo, limit) as { produk: string; qty_terjual: number }[];
  return rows.map((r) => ({ produk: r.produk, qty_terjual: Math.round(r.qty_terjual) }));
}

/** Daily report — same response shape as the old Python API's
 * `laporan-harian` (tanggal, total_revenue, total_orders, aov, top_produk)
 * so existing n8n WhatsApp-QA logic can point here with only a URL change. */
export function getDailyReport(db: Database.Database, business_id: string, date: string) {
  const m = getDailyMetrics(db, business_id, date);
  return {
    tanggal: date,
    total_revenue: m.revenue,
    total_orders: m.orders,
    aov: m.aov,
    top_produk: getTopProducts(db, business_id, date, date, 3),
  };
}

/** Weekly report — trailing 7 days ending on the latest ACTIVE transaction
 * date (falls back to today if there's no data yet), matching the old
 * `laporan-mingguan` shape (periode, total_revenue, total_orders, aov,
 * top_produk). */
export function getWeeklyReport(db: Database.Database, business_id: string) {
  const latest = db
    .prepare(
      `SELECT MAX(transaction_date) as d FROM transactions WHERE business_id = ? AND status = 'ACTIVE'`
    )
    .get(business_id) as { d: string | null };
  const dateTo = latest.d ?? new Date().toISOString().slice(0, 10);
  const dateFrom = shiftDate(dateTo, -6);

  const row = db
    .prepare(
      `SELECT COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as revenue
       FROM transactions
       WHERE business_id = ? AND status = 'ACTIVE' AND transaction_date BETWEEN ? AND ?`
    )
    .get(business_id, dateFrom, dateTo) as { orders: number; revenue: number };

  const aov = row.orders > 0 ? round2(row.revenue / row.orders) : 0;

  return {
    periode: `${dateFrom} s/d ${dateTo}`,
    total_revenue: round2(row.revenue),
    total_orders: row.orders,
    aov,
    top_produk: getTopProducts(db, business_id, dateFrom, dateTo, 3),
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
