import { randomUUID } from "crypto";
import { CorrectionReason } from "./types";
import { Db } from "./db";

export class LifecycleError extends Error {}

/** Fix a NEEDS_REVIEW row IN PLACE (same row_id, same version) — this row
 * was never ACTIVE, so there is nothing to preserve a superseded copy of.
 * See flows/02_needs_review_flow.md. */
export async function resolveNeedsReview(
  db: Db,
  row_id: string,
  edits: { total_amount?: number; transaction_date?: string; transaction_time?: string },
  resolved_by: string
) {
  const txn = await db.get(`SELECT * FROM transactions WHERE row_id = $1`, [row_id]);
  if (!txn) throw new LifecycleError("Transaksi tidak ditemukan.");
  if ((txn as any).status !== "NEEDS_REVIEW") {
    throw new LifecycleError(
      "Hanya transaksi berstatus NEEDS_REVIEW yang bisa diselesaikan lewat jalur ini. " +
        "Transaksi ACTIVE harus menggunakan createCorrection()."
    );
  }

  await db.run(
    `UPDATE transactions
     SET status = 'ACTIVE',
         total_amount = COALESCE($1, total_amount),
         transaction_date = COALESCE($2, transaction_date),
         transaction_time = COALESCE($3, transaction_time),
         validation_notes = NULL,
         resolved_by = $4,
         resolved_at = now()
     WHERE row_id = $5`,
    [edits.total_amount ?? null, edits.transaction_date ?? null, edits.transaction_time ?? null, resolved_by, row_id]
  );

  return { row_id, status: "ACTIVE" as const };
}

/** Correct an ACTIVE transaction: creates a NEW VERSION, old version ->
 * SUPERSEDED. Never increments Orders count. See flows/02.
 *
 * Dulu (SQLite) pakai db.transaction(() => {...}) yang synchronous.
 * Postgres versinya butuh 1 CONNECTION YANG SAMA untuk BEGIN...COMMIT --
 * makanya di sini kita checkout 1 client dari pool (db.connect()), bukan
 * pakai `db` (pool) langsung untuk query di dalam transaksi. Kalau ada
 * error di tengah, ROLLBACK, baru lempar errornya lagi. client.release()
 * WAJIB dipanggil di finally supaya koneksi balik ke pool, tidak bocor. */
export async function createCorrection(
  db: Db,
  row_id: string,
  newValues: { total_amount: number },
  reason: CorrectionReason,
  reason_detail: string | null,
  corrected_by: string
) {
  const txn = await db.get(`SELECT * FROM transactions WHERE row_id = $1`, [row_id]);
  if (!txn) throw new LifecycleError("Transaksi tidak ditemukan.");
  const txnRow = txn as any;
  if (txnRow.status !== "ACTIVE") {
    throw new LifecycleError(
      "Hanya transaksi berstatus ACTIVE yang bisa dikoreksi. " +
        "Transaksi NEEDS_REVIEW harus menggunakan resolveNeedsReview()."
    );
  }

  const new_row_id = randomUUID();
  const new_version = txnRow.version + 1;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Guard: if this row was already superseded by a concurrent correction,
    // this UPDATE affects 0 rows — we detect that and abort instead of
    // silently inserting a second ACTIVE version (uq_one_active_per_transaction
    // would also reject it, but we want a clear message before that).
    const info = await client.query(
      `UPDATE transactions SET status = 'SUPERSEDED' WHERE row_id = $1 AND status = 'ACTIVE'`,
      [row_id]
    );
    if (info.rowCount === 0) {
      throw new LifecycleError("Transaksi ini sudah diubah oleh proses lain. Silakan muat ulang dan coba lagi.");
    }

    await client.query(
      `INSERT INTO transactions
         (row_id, transaction_id, version, business_id, source_id, external_reference,
          transaction_date, transaction_time, total_amount, line_item_count, status,
          previous_row_id, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE', $11, now(), $12)`,
      [
        new_row_id,
        txnRow.transaction_id,
        new_version,
        txnRow.business_id,
        txnRow.source_id,
        txnRow.external_reference,
        txnRow.transaction_date,
        txnRow.transaction_time,
        newValues.total_amount,
        txnRow.line_item_count,
        row_id,
        corrected_by,
      ]
    );

    await client.query(
      `INSERT INTO transaction_events
         (event_id, transaction_id, from_row_id, to_row_id, event_type, reason, reason_detail, performed_by)
       VALUES ($1, $2, $3, $4, 'CORRECTION', $5, $6, $7)`,
      [randomUUID(), txnRow.transaction_id, row_id, new_row_id, reason, reason_detail, corrected_by]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return { row_id: new_row_id, transaction_id: txnRow.transaction_id, version: new_version };
}

/** Void an ACTIVE transaction: the event never happened / is cancelled.
 * Original row is preserved (status flips to VOID), nothing is deleted. */
export async function voidTransaction(
  db: Db,
  row_id: string,
  reason: CorrectionReason,
  reason_detail: string | null,
  performed_by: string
) {
  const txn = await db.get(`SELECT * FROM transactions WHERE row_id = $1`, [row_id]);
  if (!txn) throw new LifecycleError("Transaksi tidak ditemukan.");
  const txnRow = txn as any;
  if (txnRow.status !== "ACTIVE") {
    throw new LifecycleError("Hanya transaksi ACTIVE yang bisa dibatalkan (void).");
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const info = await client.query(`UPDATE transactions SET status = 'VOID' WHERE row_id = $1 AND status = 'ACTIVE'`, [
      row_id,
    ]);
    if (info.rowCount === 0) {
      throw new LifecycleError("Transaksi ini sudah diubah oleh proses lain. Muat ulang dan coba lagi.");
    }

    await client.query(
      `INSERT INTO transaction_events
         (event_id, transaction_id, from_row_id, to_row_id, event_type, reason, reason_detail, performed_by)
       VALUES ($1, $2, $3, NULL, 'VOID', $4, $5, $6)`,
      [randomUUID(), txnRow.transaction_id, row_id, reason, reason_detail, performed_by]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return { row_id, status: "VOID" as const };
}

/** Resolve a PENDING duplicate_flags row — either confirming it as a
 * real duplicate (caller should then call voidTransaction separately
 * with reason "Duplikat") or dismissing it as a false positive. Never
 * auto-merges or auto-deletes — this only records the human decision. */
export async function resolveDuplicateFlag(
  db: Db,
  flag_id: string,
  resolution: "CONFIRMED_DUPLICATE" | "CONFIRMED_NEW",
  resolved_by: string
) {
  const flag = await db.get(`SELECT * FROM duplicate_flags WHERE flag_id = $1`, [flag_id]);
  if (!flag) throw new LifecycleError("Duplicate flag tidak ditemukan.");
  if ((flag as any).resolution_status !== "PENDING") {
    throw new LifecycleError("Duplicate flag ini sudah diselesaikan sebelumnya.");
  }

  await db.run(
    `UPDATE duplicate_flags
     SET resolution_status = $1, resolved_by = $2, resolved_at = now()
     WHERE flag_id = $3`,
    [resolution, resolved_by, flag_id]
  );

  return { flag_id, resolution_status: resolution };
}
