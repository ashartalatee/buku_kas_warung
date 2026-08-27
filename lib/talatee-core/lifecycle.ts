import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { CorrectionReason } from "./types";

export class LifecycleError extends Error {}

/** Fix a NEEDS_REVIEW row IN PLACE (same row_id, same version) — this row
 * was never ACTIVE, so there is nothing to preserve a superseded copy of.
 * See flows/02_needs_review_flow.md. */
export function resolveNeedsReview(
  db: Database.Database,
  row_id: string,
  edits: { total_amount?: number; transaction_date?: string; transaction_time?: string },
  resolved_by: string
) {
  const txn = db.prepare(`SELECT * FROM transactions WHERE row_id = ?`).get(row_id) as any;
  if (!txn) throw new LifecycleError("Transaksi tidak ditemukan.");
  if (txn.status !== "NEEDS_REVIEW") {
    throw new LifecycleError(
      "Hanya transaksi berstatus NEEDS_REVIEW yang bisa diselesaikan lewat jalur ini. " +
        "Transaksi ACTIVE harus menggunakan createCorrection()."
    );
  }

  db.prepare(
    `UPDATE transactions
     SET status = 'ACTIVE',
         total_amount = COALESCE(?, total_amount),
         transaction_date = COALESCE(?, transaction_date),
         transaction_time = COALESCE(?, transaction_time),
         validation_notes = NULL,
         resolved_by = ?,
         resolved_at = datetime('now')
     WHERE row_id = ?`
  ).run(edits.total_amount ?? null, edits.transaction_date ?? null, edits.transaction_time ?? null, resolved_by, row_id);

  return { row_id, status: "ACTIVE" as const };
}

/** Correct an ACTIVE transaction: creates a NEW VERSION, old version ->
 * SUPERSEDED. Never increments Orders count. See flows/02. */
export function createCorrection(
  db: Database.Database,
  row_id: string,
  newValues: { total_amount: number },
  reason: CorrectionReason,
  reason_detail: string | null,
  corrected_by: string
) {
  const txn = db.prepare(`SELECT * FROM transactions WHERE row_id = ?`).get(row_id) as any;
  if (!txn) throw new LifecycleError("Transaksi tidak ditemukan.");
  if (txn.status !== "ACTIVE") {
    throw new LifecycleError(
      "Hanya transaksi berstatus ACTIVE yang bisa dikoreksi. " +
        "Transaksi NEEDS_REVIEW harus menggunakan resolveNeedsReview()."
    );
  }

  const new_row_id = randomUUID();
  const new_version = txn.version + 1;

  const tx = db.transaction(() => {
    // Guard: if this row was already superseded by a concurrent correction,
    // this UPDATE affects 0 rows — we detect that and abort instead of
    // silently inserting a second ACTIVE version (uq_one_active_per_transaction
    // would also reject it, but we want a clear message before that).
    const info = db
      .prepare(`UPDATE transactions SET status = 'SUPERSEDED' WHERE row_id = ? AND status = 'ACTIVE'`)
      .run(row_id);
    if (info.changes === 0) {
      throw new LifecycleError(
        "Transaksi ini sudah diubah oleh proses lain. Silakan muat ulang dan coba lagi."
      );
    }

    db.prepare(
      `INSERT INTO transactions
         (row_id, transaction_id, version, business_id, source_id, external_reference,
          transaction_date, transaction_time, total_amount, line_item_count, status,
          previous_row_id, created_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, datetime('now'), ?)`
    ).run(
      new_row_id,
      txn.transaction_id,
      new_version,
      txn.business_id,
      txn.source_id,
      txn.external_reference,
      txn.transaction_date,
      txn.transaction_time,
      newValues.total_amount,
      txn.line_item_count,
      row_id,
      corrected_by
    );

    db.prepare(
      `INSERT INTO transaction_events
         (event_id, transaction_id, from_row_id, to_row_id, event_type, reason, reason_detail, performed_by)
       VALUES (?, ?, ?, ?, 'CORRECTION', ?, ?, ?)`
    ).run(randomUUID(), txn.transaction_id, row_id, new_row_id, reason, reason_detail, corrected_by);
  });

  tx();
  return { row_id: new_row_id, transaction_id: txn.transaction_id, version: new_version };
}

/** Void an ACTIVE transaction: the event never happened / is cancelled.
 * Original row is preserved (status flips to VOID), nothing is deleted. */
export function voidTransaction(
  db: Database.Database,
  row_id: string,
  reason: CorrectionReason,
  reason_detail: string | null,
  performed_by: string
) {
  const txn = db.prepare(`SELECT * FROM transactions WHERE row_id = ?`).get(row_id) as any;
  if (!txn) throw new LifecycleError("Transaksi tidak ditemukan.");
  if (txn.status !== "ACTIVE") {
    throw new LifecycleError("Hanya transaksi ACTIVE yang bisa dibatalkan (void).");
  }

  const tx = db.transaction(() => {
    const info = db
      .prepare(`UPDATE transactions SET status = 'VOID' WHERE row_id = ? AND status = 'ACTIVE'`)
      .run(row_id);
    if (info.changes === 0) {
      throw new LifecycleError("Transaksi ini sudah diubah oleh proses lain. Muat ulang dan coba lagi.");
    }
    db.prepare(
      `INSERT INTO transaction_events
         (event_id, transaction_id, from_row_id, to_row_id, event_type, reason, reason_detail, performed_by)
       VALUES (?, ?, ?, NULL, 'VOID', ?, ?, ?)`
    ).run(randomUUID(), txn.transaction_id, row_id, reason, reason_detail, performed_by);
  });

  tx();
  return { row_id, status: "VOID" as const };
}

/** Resolve a PENDING duplicate_flags row — either confirming it as a
 * real duplicate (caller should then call voidTransaction separately
 * with reason "Duplikat") or dismissing it as a false positive. Never
 * auto-merges or auto-deletes — this only records the human decision. */
export function resolveDuplicateFlag(
  db: Database.Database,
  flag_id: string,
  resolution: "CONFIRMED_DUPLICATE" | "CONFIRMED_NEW",
  resolved_by: string
) {
  const flag = db.prepare(`SELECT * FROM duplicate_flags WHERE flag_id = ?`).get(flag_id) as any;
  if (!flag) throw new LifecycleError("Duplicate flag tidak ditemukan.");
  if (flag.resolution_status !== "PENDING") {
    throw new LifecycleError("Duplicate flag ini sudah diselesaikan sebelumnya.");
  }

  db.prepare(
    `UPDATE duplicate_flags
     SET resolution_status = ?, resolved_by = ?, resolved_at = datetime('now')
     WHERE flag_id = ?`
  ).run(resolution, resolved_by, flag_id);

  return { flag_id, resolution_status: resolution };
}
