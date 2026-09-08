"use client";

// Copy to: components/TrashPage.tsx
//
// Halaman Sampah (7 Sept 2026) -- lihat konteks diskusinya di
// DASHBOARD_TERANG_MOBILE_NOTES.md. Menampilkan 2 jenis barang yang bisa
// masuk Sampah: transaksi individual & batch upload (source + semua
// transaksinya). Dari sini ada 2 aksi:
//   - Pulihkan -- reversibel, langsung balik kelihatan di halaman asalnya.
//   - Hapus Permanen -- TIDAK BISA DIBATALKAN, pakai window.confirm dengan
//     penekanan eksplisit (konsisten dengan pola "Hapus Permanen" produk
//     di ProductsList.tsx) supaya tidak kepencet tidak sengaja.

import { useEffect, useState } from "react";

interface TrashTransaction {
  row_id: string;
  transaction_id: string;
  transaction_date: string;
  transaction_time: string | null;
  total_amount: number;
  status: string;
  deleted_at: string;
  deleted_by: string;
}

interface TrashSource {
  source_id: string;
  original_filename: string;
  uploaded_at: string;
  deleted_at: string;
  deleted_by: string;
  trashed_transaction_count: number;
}

export function TrashPage() {
  const [transactions, setTransactions] = useState<TrashTransaction[] | null>(null);
  const [sources, setSources] = useState<TrashSource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/trash");
    const data = await res.json();
    setTransactions(data.transactions ?? []);
    setSources(data.sources ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function restoreTransaction(row_id: string) {
    setError(null);
    setBusyId(row_id);
    const res = await fetch(`/api/transactions/${row_id}/restore`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      setError((await res.json()).error ?? "Gagal memulihkan transaksi.");
      return;
    }
    load();
  }

  async function purgeTransaction(row_id: string) {
    if (!confirm("Hapus transaksi ini PERMANEN? Ini tidak bisa dibatalkan lagi.")) return;
    setError(null);
    setBusyId(row_id);
    const res = await fetch(`/api/trash/transactions/${row_id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      setError((await res.json()).error ?? "Gagal menghapus transaksi secara permanen.");
      return;
    }
    load();
  }

  async function restoreSource(source_id: string) {
    setError(null);
    setBusyId(source_id);
    const res = await fetch(`/api/sources/${source_id}/restore`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      setError((await res.json()).error ?? "Gagal memulihkan batch upload.");
      return;
    }
    load();
  }

  async function purgeSource(source_id: string, filename: string, count: number) {
    if (
      !confirm(
        `Hapus batch "${filename}" (${count} transaksi) PERMANEN? Ini tidak bisa dibatalkan lagi.`
      )
    )
      return;
    setError(null);
    setBusyId(source_id);
    const res = await fetch(`/api/trash/sources/${source_id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      setError((await res.json()).error ?? "Gagal menghapus batch upload secara permanen.");
      return;
    }
    load();
  }

  const loading = transactions === null || sources === null;
  const isEmpty = !loading && transactions!.length === 0 && sources!.length === 0;

  return (
    <div className="font-dash flex flex-col gap-5 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-bold text-dash-text">🗑️ Sampah</h1>
        <p className="text-sm text-dash-muted">
          Transaksi & batch upload yang sudah dihapus. Bisa dipulihkan kapan saja, atau dihapus permanen dari sini.
        </p>
      </div>

      {error && <p className="rounded bg-dash-red/10 px-3 py-2 text-sm text-dash-red">{error}</p>}

      {loading ? (
        <p className="text-sm text-dash-muted">Memuat...</p>
      ) : isEmpty ? (
        <p className="dash-card p-6 text-center text-sm text-dash-muted">Sampah kosong. 🎉</p>
      ) : (
        <>
          {sources!.length > 0 && (
            <div className="dash-card">
              <p className="border-b border-dash-border p-4 text-sm font-semibold text-dash-text">
                Batch Upload ({sources!.length})
              </p>
              {sources!.map((s) => (
                <div
                  key={s.source_id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-dash-border p-3 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm text-dash-text">{s.original_filename}</p>
                    <p className="text-xs text-dash-muted">
                      {s.trashed_transaction_count} transaksi · dihapus {formatDateTime(s.deleted_at)} oleh{" "}
                      {s.deleted_by}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => restoreSource(s.source_id)}
                      disabled={busyId === s.source_id}
                      className="rounded border border-dash-border px-3 py-1 text-xs font-medium text-dash-green hover:bg-dash-surface-2 disabled:opacity-50"
                    >
                      ↺ Pulihkan
                    </button>
                    <button
                      onClick={() => purgeSource(s.source_id, s.original_filename, s.trashed_transaction_count)}
                      disabled={busyId === s.source_id}
                      className="rounded border border-dash-border px-3 py-1 text-xs font-medium text-dash-red hover:bg-dash-surface-2 disabled:opacity-50"
                    >
                      Hapus Permanen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {transactions!.length > 0 && (
            <div className="dash-card">
              <p className="border-b border-dash-border p-4 text-sm font-semibold text-dash-text">
                Transaksi ({transactions!.length})
              </p>
              {transactions!.map((t) => (
                <div
                  key={t.row_id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-dash-border p-3 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-dash-text">
                      {t.transaction_date} {t.transaction_time ?? ""} — Rp{Math.round(t.total_amount).toLocaleString("id-ID")}
                    </p>
                    <p className="text-xs text-dash-muted">
                      Status asli: {t.status} · dihapus {formatDateTime(t.deleted_at)} oleh {t.deleted_by}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => restoreTransaction(t.row_id)}
                      disabled={busyId === t.row_id}
                      className="rounded border border-dash-border px-3 py-1 text-xs font-medium text-dash-green hover:bg-dash-surface-2 disabled:opacity-50"
                    >
                      ↺ Pulihkan
                    </button>
                    <button
                      onClick={() => purgeTransaction(t.row_id)}
                      disabled={busyId === t.row_id}
                      className="rounded border border-dash-border px-3 py-1 text-xs font-medium text-dash-red hover:bg-dash-surface-2 disabled:opacity-50"
                    >
                      Hapus Permanen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(d);
}
