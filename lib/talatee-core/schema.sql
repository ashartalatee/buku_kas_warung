-- Talatee Level 1 core schema — SQLite port of schema/schema.sql
-- Same model, same rules. Swap to Postgres later with minimal changes
-- (UUID default, TIMESTAMPTZ, NUMERIC types).

CREATE TABLE IF NOT EXISTS businesses (
    business_id     TEXT PRIMARY KEY,
    business_name   TEXT NOT NULL,
    business_type   TEXT NOT NULL CHECK (business_type IN ('warung', 'laundry', 'bengkel')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sources (
    source_id           TEXT PRIMARY KEY,
    business_id         TEXT NOT NULL REFERENCES businesses(business_id),
    source_type         TEXT NOT NULL CHECK (source_type IN
                            ('csv_upload', 'excel_upload', 'receipt_ocr', 'whatsapp_manual')),
    original_filename   TEXT,
    file_hash            TEXT NOT NULL,
    uploaded_by           TEXT NOT NULL,
    uploaded_at            TEXT NOT NULL DEFAULT (datetime('now')),

    status                  TEXT NOT NULL DEFAULT 'RECEIVED'
                              CHECK (status IN ('RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED')),
    failure_reason           TEXT,
    row_count                 INTEGER,
    processed_row_count       INTEGER DEFAULT 0,
    whatsapp_message_id       TEXT,

    UNIQUE (business_id, file_hash)
);

CREATE TABLE IF NOT EXISTS transactions (
    row_id               TEXT PRIMARY KEY,
    transaction_id         TEXT NOT NULL,
    version                  INTEGER NOT NULL,

    business_id                TEXT NOT NULL REFERENCES businesses(business_id),
    source_id                    TEXT NOT NULL REFERENCES sources(source_id),

    external_reference             TEXT,

    transaction_date                 TEXT NOT NULL,
    transaction_time                   TEXT,
    total_amount                         REAL NOT NULL,
    line_item_count                        INTEGER NOT NULL,

    status                                   TEXT NOT NULL
                                              CHECK (status IN
                                                ('RECEIVED', 'EXTRACTED', 'VALID', 'NEEDS_REVIEW',
                                                 'ACTIVE', 'SUPERSEDED', 'VOID')),

    previous_row_id                            TEXT REFERENCES transactions(row_id),
    validation_notes                             TEXT,

    created_at                                     TEXT NOT NULL DEFAULT (datetime('now')),
    created_by                                       TEXT NOT NULL,
    resolved_at                                        TEXT,
    resolved_by                                          TEXT
);

-- CORE INTEGRITY RULE: at most one ACTIVE row per transaction_id.
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_per_transaction
    ON transactions(transaction_id)
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_transactions_business_date ON transactions(business_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);

CREATE TABLE IF NOT EXISTS transaction_lines (
    line_id             TEXT PRIMARY KEY,
    transaction_row_id   TEXT NOT NULL REFERENCES transactions(row_id) ON DELETE CASCADE,

    product_or_service     TEXT NOT NULL,
    category                  TEXT,
    quantity                    REAL NOT NULL,
    unit_price                    REAL NOT NULL,
    subtotal                        REAL NOT NULL,

    weight_kg                         REAL,
    service_type                        TEXT,
    sparepart                             TEXT,
    technician                              TEXT
);

CREATE INDEX IF NOT EXISTS idx_transaction_lines_row ON transaction_lines(transaction_row_id);

CREATE TABLE IF NOT EXISTS transaction_events (
    event_id            TEXT PRIMARY KEY,
    transaction_id         TEXT NOT NULL,
    from_row_id               TEXT REFERENCES transactions(row_id),
    to_row_id                   TEXT REFERENCES transactions(row_id),

    event_type                    TEXT NOT NULL CHECK (event_type IN ('CORRECTION', 'VOID')),
    reason                          TEXT NOT NULL CHECK (reason IN (
                                      'Salah input', 'OCR salah membaca', 'Duplikat',
                                      'Transaksi dibatalkan', 'Harga salah', 'Qty salah',
                                      'Tanggal salah', 'Lainnya')),
    reason_detail                      TEXT,

    performed_by                         TEXT NOT NULL,
    performed_at                           TEXT NOT NULL DEFAULT (datetime('now')),

    confirmed_via_whatsapp                   INTEGER DEFAULT 0,
    whatsapp_confirmation_message_id           TEXT
);

CREATE INDEX IF NOT EXISTS idx_transaction_events_txn ON transaction_events(transaction_id);

CREATE TABLE IF NOT EXISTS duplicate_flags (
    flag_id                TEXT PRIMARY KEY,
    business_id              TEXT NOT NULL REFERENCES businesses(business_id),

    transaction_row_id         TEXT NOT NULL REFERENCES transactions(row_id),
    candidate_row_id             TEXT NOT NULL REFERENCES transactions(row_id),

    match_type                     TEXT NOT NULL CHECK (match_type IN ('EXACT_DUPLICATE', 'POTENTIAL_DUPLICATE')),
    match_score                      REAL,
    matched_fields                     TEXT, -- JSON array as text (SQLite has no native array type)

    resolution_status                    TEXT NOT NULL DEFAULT 'PENDING'
                                          CHECK (resolution_status IN
                                            ('PENDING', 'CONFIRMED_DUPLICATE', 'CONFIRMED_NEW')),
    resolved_by                             TEXT,
    resolved_at                               TEXT,

    created_at                                  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_duplicate_flags_status ON duplicate_flags(resolution_status);
