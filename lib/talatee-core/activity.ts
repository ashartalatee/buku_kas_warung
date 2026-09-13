// Copy to: lib/talatee-core/activity.ts
//
// Activity Log -- TIDAK menambah tabel baru. Menggabungkan 5 sumber event
// yang sudah tercatat terpisah (transaction_events, stock_adjustments,
// sources, duplicate_flags, dan soft-delete di transactions) jadi 1
// linimasa terurut. Setiap query dibatasi `limit` lalu digabung & di-sort
// ulang di JS -- cukup untuk skala 1 warung/pilot; kalau nanti volumenya
// besar (banyak klien, banyak transaksi), pendekatan ini perlu diganti
// UNION ALL di SQL supaya limit-nya benar di level database, bukan di JS.

export interface ActivityItem {
  id: string;
  type: "correction" | "void" | "stock_adjustment" | "upload" | "duplicate_resolved" | "trashed";
  message: string;
  detail?: string | null;
  performed_by: string;
  performed_at: string;
}

function formatRupiah(n: number): string {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tipe pool DB
// sama seperti yang dipakai file lain di talatee-core (lihat db.ts), tidak
// ada type export terpisah untuk itu.
export async function getActivityFeed(db: any, businessId: string, limit = 50): Promise<ActivityItem[]> {
  const [corrections, stockAdj, uploads, duplicates, trashed] = await Promise.all([
    db.all(
      `SELECT te.event_id AS id, te.event_type, te.reason, te.reason_detail,
              te.performed_by, te.performed_at, t.transaction_date, t.total_amount
       FROM transaction_events te
       JOIN transactions t ON t.row_id = COALESCE(te.to_row_id, te.from_row_id)
       WHERE t.business_id = $1
       ORDER BY te.performed_at DESC
       LIMIT $2`,
      [businessId, limit]
    ),
    db.all(
      `SELECT sa.adjustment_id AS id, sa.delta, sa.stock_after, sa.reason, sa.reason_detail,
              sa.performed_by, sa.performed_at, p.name AS product_name, p.unit
       FROM stock_adjustments sa
       JOIN products p ON p.product_id = sa.product_id
       WHERE sa.business_id = $1
       ORDER BY sa.performed_at DESC
       LIMIT $2`,
      [businessId, limit]
    ),
    db.all(
      `SELECT source_id AS id, source_type, original_filename, status, failure_reason,
              row_count, processed_row_count, uploaded_by, uploaded_at
       FROM sources
       WHERE business_id = $1 AND deleted_at IS NULL AND status IN ('COMPLETED', 'FAILED')
       ORDER BY uploaded_at DESC
       LIMIT $2`,
      [businessId, limit]
    ),
    db.all(
      `SELECT flag_id AS id, match_type, resolution_status, resolved_by, resolved_at
       FROM duplicate_flags
       WHERE business_id = $1 AND resolution_status != 'PENDING' AND resolved_at IS NOT NULL
       ORDER BY resolved_at DESC
       LIMIT $2`,
      [businessId, limit]
    ),
    db.all(
      `SELECT row_id AS id, transaction_id, deleted_by, deleted_at, total_amount, transaction_date
       FROM transactions
       WHERE business_id = $1 AND deleted_at IS NOT NULL
       ORDER BY deleted_at DESC
       LIMIT $2`,
      [businessId, limit]
    ),
  ]);

  const items: ActivityItem[] = [];

  for (const r of corrections) {
    items.push({
      id: `correction-${r.id}`,
      type: r.event_type === "VOID" ? "void" : "correction",
      message:
        r.event_type === "VOID"
          ? `Transaksi ${r.transaction_date} (${formatRupiah(r.total_amount)}) dibatalkan`
          : `Transaksi ${r.transaction_date} (${formatRupiah(r.total_amount)}) dikoreksi`,
      detail: r.reason + (r.reason_detail ? ` — ${r.reason_detail}` : ""),
      performed_by: r.performed_by,
      performed_at: r.performed_at,
    });
  }

  for (const r of stockAdj) {
    const sign = r.delta > 0 ? "+" : "";
    items.push({
      id: `stock-${r.id}`,
      type: "stock_adjustment",
      message: `Stok "${r.product_name}" ${sign}${r.delta} ${r.unit} (sisa ${r.stock_after})`,
      detail: r.reason + (r.reason_detail ? ` — ${r.reason_detail}` : ""),
      performed_by: r.performed_by,
      performed_at: r.performed_at,
    });
  }

  for (const r of uploads) {
    items.push({
      id: `upload-${r.id}`,
      type: "upload",
      message:
        r.status === "COMPLETED"
          ? `File "${r.original_filename}" berhasil diproses (${r.processed_row_count ?? r.row_count ?? 0} baris)`
          : `File "${r.original_filename}" gagal diproses`,
      detail: r.status === "FAILED" ? r.failure_reason : null,
      performed_by: r.uploaded_by,
      performed_at: r.uploaded_at,
    });
  }

  for (const r of duplicates) {
    items.push({
      id: `dup-${r.id}`,
      type: "duplicate_resolved",
      message:
        r.resolution_status === "CONFIRMED_DUPLICATE"
          ? "Kandidat duplikat dikonfirmasi sebagai duplikat"
          : "Kandidat duplikat dikonfirmasi sebagai transaksi baru (bukan duplikat)",
      detail: r.match_type,
      performed_by: r.resolved_by ?? "-",
      performed_at: r.resolved_at,
    });
  }

  for (const r of trashed) {
    items.push({
      id: `trash-${r.id}`,
      type: "trashed",
      message: `Transaksi ${r.transaction_date} (${formatRupiah(r.total_amount)}) dibuang ke Sampah`,
      detail: null,
      performed_by: r.deleted_by,
      performed_at: r.deleted_at,
    });
  }

  items.sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime());

  return items.slice(0, limit);
}
