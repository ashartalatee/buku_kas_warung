"use client";

// Copy to: components/DataInboxList.tsx
//
// Answers "file saya sudah masuk?" per SPEC.md §8. A FAILED upload is
// never dropped silently — it shows here with its failure_reason and
// a re-upload prompt, forever (or until the user fixes and re-uploads
// successfully), consistent with "never silently fail."
//
// Tombol "Hapus" (7 Sept 2026, fitur Sampah) menghapus 1 batch upload
// BESERTA SEMUA transaksi turunannya sekaligus ke Sampah -- reversibel,
// bukan permanen (lihat lifecycle.ts softDeleteSource). Berguna khusus
// untuk data latihan/testing: upload file salah -> hapus 1 batch,
// daripada hapus satu-satu di halaman Transaksi.

import Link from "next/link";
import { useEffect, useState } from "react";

interface SourceRow {
  source_id: string;
  original_filename: string;
  status: "RECEIVED" | "PROCESSING" | "COMPLETED" | "FAILED";
  failure_reason: string | null;
  row_count: number | null;
  processed_row_count: number;
  uploaded_at: string;
}

const STATUS_ICON: Record<SourceRow["status"], string> = {
  RECEIVED: "⏳",
  PROCESSING: "⏳",
  COMPLETED: "✅",
  FAILED: "❌",
};

export function DataInboxList() {
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/sources");
    setRows(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function submitDelete(source_id: string) {
    setError(null);
    setBusyId(source_id);
    const res = await fetch(`/api/sources/${source_id}/delete`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal menghapus batch upload ini.");
      return;
    }
    setDeletingId(null);
    load();
  }

  if (loading) return <p className="text-sm text-dash-muted">Memuat...</p>;
  if (rows.length === 0) return <p className="text-sm text-dash-muted">Belum ada file diupload.</p>;

  return (
    <div className="dash-card font-dash">
      <p className="border-b border-dash-border p-4 text-sm font-medium text-dash-text">Data Inbox</p>
      {rows.map((row) => (
        <div key={row.source_id} className="border-b border-dash-border p-3 last:border-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm break-all text-dash-text">
                {STATUS_ICON[row.status]} {row.original_filename}
              </p>
              <p className="mt-1 text-xs text-dash-muted">
                {row.uploaded_at}
                {row.status === "COMPLETED" &&
                  ` · ${row.processed_row_count}/${row.row_count} baris diproses`}
              </p>
              {row.status === "FAILED" && (
                <p className="mt-1 text-xs text-dash-red">{row.failure_reason}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {row.status === "FAILED" && (
                <Link
                  href="/upload"
                  className="rounded border border-dash-border px-3 py-1 text-xs font-medium text-dash-text hover:bg-dash-surface-2"
                >
                  Upload ulang
                </Link>
              )}
              {deletingId !== row.source_id && (
                <button
                  onClick={() => setDeletingId(row.source_id)}
                  title="Hapus batch ini + semua transaksinya ke Sampah"
                  className="rounded border border-dash-border px-3 py-1 text-xs font-medium text-dash-red hover:bg-dash-surface-2"
                >
                  🗑️ Hapus
                </button>
              )}
            </div>
          </div>

          {deletingId === row.source_id && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dash-border pt-3">
              <span className="text-xs text-dash-text">
                Hapus batch ini (beserta SEMUA transaksi dari file ini) ke Sampah? Masih bisa dipulihkan.
              </span>
              <button
                onClick={() => submitDelete(row.source_id)}
                disabled={busyId === row.source_id}
                className="rounded bg-dash-red px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {busyId === row.source_id ? "Menghapus..." : "Ya, hapus batch ini"}
              </button>
              <button onClick={() => setDeletingId(null)} className="rounded px-3 py-1 text-xs text-dash-muted">
                Batal
              </button>
            </div>
          )}
        </div>
      ))}
      {error && <p className="border-t border-dash-border p-3 text-sm text-dash-red">{error}</p>}
    </div>
  );
}
