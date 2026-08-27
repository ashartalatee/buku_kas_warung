import { ExtractedTransaction, ParsedLine, RawCsvRow, ValidationResult } from "./types";

export const REQUIRED_HEADERS = ["tanggal", "produk", "qty", "harga_satuan", "subtotal"];

export function checkHeaders(headers: string[]): ValidationResult {
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return {
      ok: false,
      errors: [
        `Kolom wajib tidak ditemukan: ${missing.join(", ")}. Silakan gunakan template Talatee (tombol unduh di atas form upload) atau sesuaikan nama kolom pada file Anda.`,
      ],
    };
  }
  return { ok: true, errors: [] };
}

/**
 * Groups raw CSV rows into transactions.
 * - Rows sharing a non-empty transaction_ref become ONE transaction with
 *   multiple lines (grouped mode).
 * - Rows with no transaction_ref each become their own transaction
 *   (flat mode).
 */
export function groupRowsIntoTransactions(
  rows: RawCsvRow[]
): { external_reference?: string; rows: RawCsvRow[] }[] {
  const groups: { external_reference?: string; rows: RawCsvRow[] }[] = [];
  const refIndex = new Map<string, number>();

  for (const row of rows) {
    const ref = row.transaction_ref?.trim();
    if (ref) {
      if (refIndex.has(ref)) {
        groups[refIndex.get(ref)!].rows.push(row);
      } else {
        refIndex.set(ref, groups.length);
        groups.push({ external_reference: ref, rows: [row] });
      }
    } else {
      groups.push({ rows: [row] }); // flat mode: always its own group
    }
  }
  return groups;
}

/** Field-level validation + extraction for one transaction group. */
export function extractTransaction(
  group: { external_reference?: string; rows: RawCsvRow[] }
): { extracted?: ExtractedTransaction; errors: string[] } {
  const errors: string[] = [];
  const lines: ParsedLine[] = [];

  let transaction_date: string | undefined;
  let transaction_time: string | undefined;

  for (const [i, row] of group.rows.entries()) {
    const rowLabel = group.rows.length > 1 ? ` (baris ke-${i + 1} dari grup)` : "";

    if (!row.tanggal || !isValidDate(row.tanggal)) {
      errors.push(`Tanggal tidak valid atau kosong${rowLabel}`);
      continue;
    }
    if (transaction_date === undefined) transaction_date = row.tanggal;
    if (transaction_time === undefined && row.waktu) transaction_time = row.waktu;

    if (!row.produk || row.produk.trim() === "") {
      errors.push(`Produk/layanan kosong${rowLabel}`);
      continue;
    }

    const qty = toNumber(row.qty);
    const unitPrice = toNumber(row.harga_satuan);
    const subtotal = toNumber(row.subtotal);

    if (qty === null) {
      errors.push(`Qty bukan angka yang valid${rowLabel}: "${row.qty}"`);
      continue;
    }
    if (unitPrice === null) {
      errors.push(`Harga satuan bukan angka yang valid${rowLabel}: "${row.harga_satuan}"`);
      continue;
    }
    if (subtotal === null) {
      errors.push(`Subtotal bukan angka yang valid${rowLabel}: "${row.subtotal}"`);
      continue;
    }

    lines.push({
      product_or_service: row.produk.trim(),
      category: row.kategori?.trim() || undefined,
      quantity: qty,
      unit_price: unitPrice,
      subtotal,
    });
  }

  if (errors.length > 0 || !transaction_date || lines.length === 0) {
    return { errors: errors.length > 0 ? errors : ["Tidak ada baris valid dalam grup ini"] };
  }

  const total_amount = round2(lines.reduce((sum, l) => sum + l.subtotal, 0));

  return {
    extracted: {
      external_reference: group.external_reference,
      transaction_date,
      transaction_time,
      lines,
      total_amount,
    },
    errors: [],
  };
}

/**
 * Business validation: arithmetic consistency (qty * unit_price ~= subtotal
 * per line), date sanity.
 *
 * Tolerance policy (per SPEC.md §10 / §13): proportional tolerance with a
 * floor and ceiling, started conservative for the pilot. Starting values
 * below are the initial hypothesis — meant to be tuned once real
 * transaction data is available, per the empirical-threshold principle
 * used for OCR confidence too.
 */
const TOLERANCE_PERCENT = 0.005; // 0.5% of the line subtotal
const TOLERANCE_FLOOR = 5; // rupiah — absorbs floating point rounding
const TOLERANCE_CEILING = 500; // rupiah — never allow more slack than this

export function validateBusinessRules(txn: ExtractedTransaction): ValidationResult {
  const errors: string[] = [];

  for (const [i, line] of txn.lines.entries()) {
    const expected = round2(line.quantity * line.unit_price);
    const diff = Math.abs(expected - line.subtotal);
    const tolerance = clamp(
      line.subtotal * TOLERANCE_PERCENT,
      TOLERANCE_FLOOR,
      TOLERANCE_CEILING
    );
    if (diff > tolerance) {
      errors.push(
        `Baris ${i + 1} (${line.product_or_service}): qty x harga = ${expected}, ` +
          `tapi subtotal tertulis ${line.subtotal} (selisih ${diff.toFixed(2)}, ` +
          `toleransi ${tolerance.toFixed(2)})`
      );
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  if (txn.transaction_date > today) {
    errors.push(`Tanggal transaksi (${txn.transaction_date}) ada di masa depan`);
  }

  return { ok: errors.length === 0, errors };
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

function toNumber(s: string | undefined): number | null {
  if (s === undefined || s.trim() === "") return null;
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? null : n;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
