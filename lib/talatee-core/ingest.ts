import { Db } from "./db";
import { randomUUID, createHash } from "crypto";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import {
  checkHeaders,
  groupRowsIntoTransactions,
  extractTransaction,
  validateBusinessRules,
} from "./validation";
import { findFingerprintMatches, createDuplicateFlag } from "./duplicate";
import { RawCsvRow, IngestSummary } from "./types";

export function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Proper CSV parsing via csv-parse: handles quoted fields, embedded
 * commas, CRLF/LF, and BOM. First row = headers. */
function parseCsv(content: string): { headers: string[]; rows: RawCsvRow[] } {
  const records: Record<string, string>[] = parse(content, {
    columns: (header: string[]) => header.map((h) => h.trim()),
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  return { headers, rows: records as RawCsvRow[] };
}

/** Excel parsing via SheetJS: reads the first sheet, first row = headers.
 * Numeric cells (qty, harga_satuan, subtotal) come back as JS numbers from
 * SheetJS — normalized to strings here so downstream validation code
 * (written for CSV's all-string rows) works unchanged for both formats. */
function parseExcel(buffer: Buffer): { headers: string[]; rows: RawCsvRow[] } {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { headers: [], rows: [] };

  const sheet = workbook.Sheets[firstSheetName];
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: true,
  });

  const headers = raw.length > 0 ? Object.keys(raw[0]).map((h) => h.trim()) : [];
  const rows: RawCsvRow[] = raw.map((r) => {
    const row: RawCsvRow = {};
    for (const [key, value] of Object.entries(r)) {
      (row as any)[key.trim()] = value === "" || value === undefined || value === null
        ? ""
        : String(value);
    }
    return row;
  });

  return { headers, rows };
}

/** Shared pipeline for both CSV and Excel: structural check → per-group
 * extraction/validation → duplicate check → insert. This is the same
 * flow documented in docs/flows/01_csv_ingestion_flow.md, now reused for
 * any tabular source rather than being CSV-specific. */
async function ingestParsedRows(
  db: Db,
  business_id: string,
  source_id: string,
  headers: string[],
  rows: RawCsvRow[],
  uploaded_by: string
): Promise<IngestSummary> {
  const headerCheck = checkHeaders(headers);
  if (!headerCheck.ok) {
    await db.run(`UPDATE sources SET status = 'FAILED', failure_reason = $1 WHERE source_id = $2`, [
      headerCheck.errors.join("; "),
      source_id,
    ]);
    throw new Error(`Struktur file gagal: ${headerCheck.errors.join("; ")}`);
  }

  await db.run(`UPDATE sources SET status = 'PROCESSING', row_count = $1 WHERE source_id = $2`, [
    rows.length,
    source_id,
  ]);

  // --- Steps 3-6: group rows into transactions, then extract/validate each ---
  const groups = groupRowsIntoTransactions(rows);

  let active_count = 0;
  let needs_review_count = 0;
  let duplicate_flag_count = 0;
  let processed = 0;

  const INSERT_TXN_SQL = `INSERT INTO transactions
       (row_id, transaction_id, version, business_id, source_id, external_reference,
        transaction_date, transaction_time, total_amount, line_item_count, status,
        validation_notes, created_at, created_by)
     VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), $12)`;
  const INSERT_LINE_SQL = `INSERT INTO transaction_lines
       (line_id, transaction_row_id, product_or_service, category, quantity, unit_price, subtotal)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`;

  for (const group of groups) {
    const { extracted, errors: extractErrors } = extractTransaction(group);

    if (!extracted) {
      // Couldn't even extract a coherent transaction (e.g. bad date on every
      // row of the group) — still saved as NEEDS_REVIEW, never dropped.
      const row_id = randomUUID();
      const txn_id = randomUUID();
      await db.run(INSERT_TXN_SQL, [
        row_id,
        txn_id,
        business_id,
        source_id,
        group.external_reference ?? null,
        group.rows[0]?.tanggal ?? "1970-01-01",
        null,
        0,
        0,
        "NEEDS_REVIEW",
        extractErrors.join("; "),
        uploaded_by,
      ]);
      needs_review_count++;
      processed++;
      continue;
    }

    const businessCheck = validateBusinessRules(extracted);
    const row_id = randomUUID();
    const transaction_id = randomUUID();

    if (!businessCheck.ok) {
      await db.run(INSERT_TXN_SQL, [
        row_id,
        transaction_id,
        business_id,
        source_id,
        extracted.external_reference ?? null,
        extracted.transaction_date,
        extracted.transaction_time ?? null,
        extracted.total_amount,
        extracted.lines.length,
        "NEEDS_REVIEW",
        businessCheck.errors.join("; "),
        uploaded_by,
      ]);
      for (const line of extracted.lines) {
        await db.run(INSERT_LINE_SQL, [
          randomUUID(),
          row_id,
          line.product_or_service,
          line.category ?? null,
          line.quantity,
          line.unit_price,
          line.subtotal,
        ]);
      }
      needs_review_count++;
      processed++;
      continue;
    }

    // Passed all validation: becomes ACTIVE. Duplicate check runs but does
    // NOT block ingestion (per SPEC.md §6 / flows/01).
    await db.run(INSERT_TXN_SQL, [
      row_id,
      transaction_id,
      business_id,
      source_id,
      extracted.external_reference ?? null,
      extracted.transaction_date,
      extracted.transaction_time ?? null,
      extracted.total_amount,
      extracted.lines.length,
      "ACTIVE",
      null,
      uploaded_by,
    ]);
    for (const line of extracted.lines) {
      await db.run(INSERT_LINE_SQL, [
        randomUUID(),
        row_id,
        line.product_or_service,
        line.category ?? null,
        line.quantity,
        line.unit_price,
        line.subtotal,
      ]);
    }
    active_count++;

    const matches = await findFingerprintMatches(db, business_id, extracted, row_id);
    for (const match of matches) {
      await createDuplicateFlag(db, business_id, row_id, match.row_id, match);
      duplicate_flag_count++;
    }

    processed++;
  }

  await db.run(`UPDATE sources SET status = 'COMPLETED', processed_row_count = $1 WHERE source_id = $2`, [
    processed,
    source_id,
  ]);

  return {
    source_id,
    row_count: groups.length,
    active_count,
    needs_review_count,
    duplicate_flag_count,
  };
}

async function createSourceRow(
  db: Db,
  business_id: string,
  source_type: "csv_upload" | "excel_upload",
  filename: string,
  file_hash: string,
  uploaded_by: string
): Promise<string> {
  // deleted_at IS NULL (7 Sept 2026, fitur Sampah): kalau upload lama
  // dengan hash yang sama sudah dibuang ke Sampah, file yang sama BOLEH
  // diupload ulang -- lihat uq_sources_business_file_hash_active (partial
  // unique index) di schema.sql untuk alasan constraint-nya juga diganti,
  // bukan cuma cek ini saja.
  const existing = await db.get(
    `SELECT source_id FROM sources WHERE business_id = $1 AND file_hash = $2 AND deleted_at IS NULL`,
    [business_id, file_hash]
  );
  if (existing) {
    throw new Error("File ini sudah pernah diupload sebelumnya (exact duplicate file).");
  }

  const source_id = randomUUID();
  await db.run(
    `INSERT INTO sources (source_id, business_id, source_type, original_filename, file_hash, uploaded_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'RECEIVED')`,
    [source_id, business_id, source_type, filename, file_hash, uploaded_by]
  );
  return source_id;
}

export async function ingestCsv(
  db: Db,
  business_id: string,
  filename: string,
  fileContent: string,
  uploaded_by: string
): Promise<IngestSummary> {
  const file_hash = sha256(fileContent);
  const source_id = await createSourceRow(db, business_id, "csv_upload", filename, file_hash, uploaded_by);
  const { headers, rows } = parseCsv(fileContent);
  return ingestParsedRows(db, business_id, source_id, headers, rows, uploaded_by);
}

export async function ingestExcel(
  db: Db,
  business_id: string,
  filename: string,
  fileBuffer: Buffer,
  uploaded_by: string
): Promise<IngestSummary> {
  const file_hash = sha256(fileBuffer);
  const source_id = await createSourceRow(db, business_id, "excel_upload", filename, file_hash, uploaded_by);
  const { headers, rows } = parseExcel(fileBuffer);
  return ingestParsedRows(db, business_id, source_id, headers, rows, uploaded_by);
}
