"use client";

// Copy to: components/TransactionsList.tsx
//
// Per SPEC.md §8: correction history shows INLINE here (badge + "Lihat
// riwayat"), not as a separate page section — it's transparency info,
// not something waiting on user action. NEEDS_REVIEW rows still show
// up here too (so the list is a complete picture), but their "fix"
// action points at NeedsReviewList's flow, not correction.

import { useEffect, useState } from "react";

const REASONS = [
  "Salah input",
  "OCR salah membaca",
  "Duplikat",
  "Transaksi dibatalkan",
  "Harga salah",
  "Qty salah",
  "Tanggal salah",
  "Lainnya",
] as const;

interface Txn {
  row_id: string;
  transaction_id: string;
  version: number;
  transaction_date: string;
  transaction_time: string | null;
  total_amount: number;
  status: "ACTIVE" | "NEEDS_REVIEW" | "VOID";
  was_corrected: boolean;
}

interface VersionEntry {
  version: number;
  status: string;
  total_amount: number;
  created_at: string;
}

const STATUS_STYLE: Record<Txn["status"], string> = {
  ACTIVE: "text-dash-text",
  NEEDS_REVIEW: "text-dash-amber",
  VOID: "text-dash-muted line-through",
};

export function TransactionsList({ date }: { date?: string }) {
  const [rows, setRows] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctValue, setCorrectValue] = useState("");
  const [correctReason, setCorrectReason] = useState<(typeof REASONS)[number]>("Salah input");
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [history, setHistory] = useState<VersionEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null); // baris yang sedang minta konfirmasi hapus
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const qs = date ? `?date=${date}` : "";
    const res = await fetch(`/api/transactions${qs}`);
    setRows(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [date]);

  async function submitCorrection(row_id: string) {
    setError(null);
    const total_amount = Number(correctValue);
    if (isNaN(total_amount) || total_amount <= 0) {
      setError("Masukkan nilai total yang valid.");
      return;
    }

    const res = await fetch(`/api/transactions/${row_id}/correction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total_amount, reason: correctReason }),
    });

    if (!res.ok) {
      const data = await res.json();
      // e.g. a concurrent-correction conflict from lifecycle.ts — shown
      // as-is rather than silently retried, per SPEC.md §13.
      setError(data.error ?? "Gagal menyimpan koreksi.");
      return;
    }

    setCorrectingId(null);
    setCorrectValue("");
    load();
  }

  async function loadHistory(transaction_id: string, row_id: string) {
    if (historyFor === transaction_id) {
      setHistoryFor(null);
      return;
    }
    const res = await fetch(`/api/transactions/${row_id}/lineage`);
    const data = await res.json();
    setHistory(data.version_history ?? []);
    setHistoryFor(transaction_id);
  }

  // Hapus ke Sampah -- REVERSIBEL, bukan permanen (lihat lifecycle.ts
  // softDeleteTransaction). Baris langsung hilang dari daftar ini setelah
  // berhasil (backend sudah filter deleted_at IS NULL), bisa dipulihkan
  // lewat halaman Sampah kapan saja. Hapus PERMANEN sengaja tidak ada di
  // sini -- cuma bisa dari halaman Sampah, supaya selalu 2 langkah sadar.
  async function submitDelete(row_id: string) {
    setError(null);
    setDeleteBusyId(row_id);
    const res = await fetch(`/api/transactions/${row_id}/delete`, { method: "POST" });
    setDeleteBusyId(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal menghapus transaksi.");
      return;
    }
    setDeletingId(null);
    load();
  }

  if (loading) return <p className="text-sm text-dash-muted">Memuat...</p>;

  return (
    <div className="dash-card">
      {rows.map((row) => (
        <div key={row.row_id} className="border-b border-dash-border p-4 last:border-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className={`text-sm font-medium ${STATUS_STYLE[row.status]}`}>
                {row.transaction_date} {row.transaction_time ?? ""} — Rp
                {row.total_amount.toLocaleString("id-ID")}
              </p>

              {row.was_corrected && (
                <button
                  onClick={() => loadHistory(row.transaction_id, row.row_id)}
                  className="mt-1 inline-block rounded bg-dash-surface-2 px-2 py-0.5 text-xs text-dash-accent"
                >
                  Dikoreksi · Lihat riwayat
                </button>
              )}
              {row.status === "VOID" && (
                <span className="mt-1 inline-block rounded bg-dash-surface-2 px-2 py-0.5 text-xs text-dash-muted">
                  Dibatalkan
                </span>
              )}
              {row.status === "NEEDS_REVIEW" && (
                <span className="mt-1 inline-block rounded bg-dash-surface-2 px-2 py-0.5 text-xs text-dash-amber">
                  Perlu review — lihat bagian Needs Review
                </span>
              )}
            </div>

            {row.status === "ACTIVE" && correctingId !== row.row_id && (
              <button
                onClick={() => {
                  setCorrectingId(row.row_id);
                  setCorrectValue(String(row.total_amount));
                }}
                className="rounded border border-dash-border px-3 py-1 text-xs font-medium text-dash-text hover:bg-dash-surface-2"
              >
                Koreksi
              </button>
            )}
            {deletingId !== row.row_id && (
              <button
                onClick={() => setDeletingId(row.row_id)}
                className="rounded border border-dash-border px-3 py-1 text-xs font-medium text-dash-red hover:bg-dash-surface-2"
                title="Hapus ke Sampah (masih bisa dipulihkan)"
              >
                🗑️ Hapus
              </button>
            )}
          </div>

          {deletingId === row.row_id && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dash-border pt-3">
              <span className="text-xs text-dash-text">
                Hapus transaksi ini ke Sampah? Masih bisa dipulihkan nanti.
              </span>
              <button
                onClick={() => submitDelete(row.row_id)}
                disabled={deleteBusyId === row.row_id}
                className="rounded bg-dash-red px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {deleteBusyId === row.row_id ? "Menghapus..." : "Ya, hapus"}
              </button>
              <button onClick={() => setDeletingId(null)} className="rounded px-3 py-1 text-xs text-dash-muted">
                Batal
              </button>
            </div>
          )}

          {historyFor === row.transaction_id && (
            <div className="mt-2 rounded bg-dash-surface-2 p-3 text-xs">
              {history.map((v) => (
                <p key={v.version} className={v.status === "SUPERSEDED" ? "text-dash-muted" : "text-dash-text"}>
                  v{v.version} · Rp{v.total_amount.toLocaleString("id-ID")} · {v.status} · {v.created_at}
                </p>
              ))}
            </div>
          )}

          {correctingId === row.row_id && (
            <div className="mt-3 flex flex-col gap-2 border-t border-dash-border pt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-dash-muted">Total benar (Rp)</span>
                <input
                  type="number"
                  value={correctValue}
                  onChange={(e) => setCorrectValue(e.target.value)}
                  className="w-32 rounded border border-dash-border bg-dash-surface px-2 py-1 text-sm text-dash-text outline-none focus:border-dash-accent"
                  autoFocus
                />
              </div>
              <select
                value={correctReason}
                onChange={(e) => setCorrectReason(e.target.value as (typeof REASONS)[number])}
                className="w-fit rounded border border-dash-border bg-dash-surface px-2 py-1 text-sm text-dash-text"
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => submitCorrection(row.row_id)}
                  className="rounded bg-dash-accent px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                >
                  Simpan koreksi
                </button>
                <button
                  onClick={() => setCorrectingId(null)}
                  className="rounded px-3 py-1 text-xs text-dash-muted"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {error && <p className="border-t border-dash-border p-3 text-sm text-dash-red">{error}</p>}
    </div>
  );
}
