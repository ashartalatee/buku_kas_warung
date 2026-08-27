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
  ACTIVE: "text-neutral-900",
  NEEDS_REVIEW: "text-amber-700",
  VOID: "text-neutral-400 line-through",
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

  if (loading) return <p className="text-sm text-neutral-400">Memuat...</p>;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      {rows.map((row) => (
        <div key={row.row_id} className="border-b border-neutral-100 p-4 last:border-0">
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-sm font-medium ${STATUS_STYLE[row.status]}`}>
                {row.transaction_date} {row.transaction_time ?? ""} — Rp
                {row.total_amount.toLocaleString("id-ID")}
              </p>

              {row.was_corrected && (
                <button
                  onClick={() => loadHistory(row.transaction_id, row.row_id)}
                  className="mt-1 inline-block rounded bg-sky-50 px-2 py-0.5 text-xs text-sky-700"
                >
                  Dikoreksi · Lihat riwayat
                </button>
              )}
              {row.status === "VOID" && (
                <span className="mt-1 inline-block rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                  Dibatalkan
                </span>
              )}
              {row.status === "NEEDS_REVIEW" && (
                <span className="mt-1 inline-block rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
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
                className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-medium"
              >
                Koreksi
              </button>
            )}
          </div>

          {historyFor === row.transaction_id && (
            <div className="mt-2 rounded-lg bg-neutral-50 p-3 text-xs">
              {history.map((v) => (
                <p key={v.version} className={v.status === "SUPERSEDED" ? "text-neutral-400" : "text-neutral-800"}>
                  v{v.version} · Rp{v.total_amount.toLocaleString("id-ID")} · {v.status} · {v.created_at}
                </p>
              ))}
            </div>
          )}

          {correctingId === row.row_id && (
            <div className="mt-3 flex flex-col gap-2 border-t border-neutral-100 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">Total benar (Rp)</span>
                <input
                  type="number"
                  value={correctValue}
                  onChange={(e) => setCorrectValue(e.target.value)}
                  className="w-32 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                  autoFocus
                />
              </div>
              <select
                value={correctReason}
                onChange={(e) => setCorrectReason(e.target.value as (typeof REASONS)[number])}
                className="w-fit rounded-md border border-neutral-300 px-2 py-1 text-sm"
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
                  className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white"
                >
                  Simpan koreksi
                </button>
                <button
                  onClick={() => setCorrectingId(null)}
                  className="rounded-md px-3 py-1 text-xs text-neutral-500"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {error && <p className="border-t border-neutral-100 p-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
