"use client";

// Copy to: components/UploadCsvForm.tsx
//
// Calls POST /api/transactions/upload. Always shows the real outcome
// returned by the API (how many ACTIVE vs NEEDS_REVIEW) — never a bare
// "berhasil!" — per the "never silently fail" principle from SPEC.md.

import { useState } from "react";

interface UploadResult {
  status?: string;
  active_count?: number;
  needs_review_count?: number;
  duplicate_flag_count?: number;
  message?: string;
  error?: string;
}

export function UploadCsvForm({ onUploaded }: { onUploaded?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setResult(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/transactions/upload", { method: "POST", body: form });
      const data: UploadResult = await res.json();

      if (!res.ok) {
        setResult({ error: data.error ?? "Gagal mengupload file." });
      } else {
        setResult(data);
        onUploaded?.();
      }
    } catch {
      setResult({ error: "Tidak bisa menghubungi server. Coba lagi." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-700">Upload data penjualan (CSV/Excel)</p>
        <a href="/template-transaksi.csv" download className="text-xs text-sky-600 underline">Unduh Template CSV</a>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <button
          type="submit"
          disabled={!file || uploading}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {uploading ? "Memproses..." : "Upload"}
        </button>
      </form>

      {result?.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          ❌ {result.error}
        </p>
      )}

      {result && !result.error && (
        <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <p>✅ {result.message}</p>
          {(result.needs_review_count ?? 0) > 0 && (
            <p className="mt-1 text-amber-700">
              ⚠️ {result.needs_review_count} transaksi butuh review sebelum masuk laporan.
            </p>
          )}
          {(result.duplicate_flag_count ?? 0) > 0 && (
            <p className="mt-1 text-red-700">
              🔎 {result.duplicate_flag_count} kemungkinan duplikat ditemukan, cek halaman Transaksi.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
