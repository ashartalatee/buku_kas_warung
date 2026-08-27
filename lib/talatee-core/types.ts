export type TransactionStatus =
  | "RECEIVED"
  | "EXTRACTED"
  | "VALID"
  | "NEEDS_REVIEW"
  | "ACTIVE"
  | "SUPERSEDED"
  | "VOID";

export type CorrectionReason =
  | "Salah input"
  | "OCR salah membaca"
  | "Duplikat"
  | "Transaksi dibatalkan"
  | "Harga salah"
  | "Qty salah"
  | "Tanggal salah"
  | "Lainnya";

export interface RawCsvRow {
  tanggal?: string;
  waktu?: string;
  transaction_ref?: string;
  produk?: string;
  kategori?: string;
  qty?: string;
  harga_satuan?: string;
  subtotal?: string;
}

export interface ParsedLine {
  product_or_service: string;
  category?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface ExtractedTransaction {
  external_reference?: string;
  transaction_date: string; // YYYY-MM-DD
  transaction_time?: string; // HH:MM
  lines: ParsedLine[];
  total_amount: number;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export interface IngestSummary {
  source_id: string;
  row_count: number;
  active_count: number;
  needs_review_count: number;
  duplicate_flag_count: number;
}
