"use client";

// Copy to: components/UploadCsvForm.tsx
//
// Calls POST /api/transactions/upload. Always shows the real outcome
// returned by the API (how many ACTIVE vs NEEDS_REVIEW) — never a bare
// "berhasil!" — per the "never silently fail" principle from SPEC.md.
//
// Sampai 6 Sept 2026 komponen ini punya 2 tampilan (variant "ledger" lama
// & "dash" baru) karena dipakai di 2 tempat berbeda dengan tema berbeda.
// 7 Sept 2026: disederhanakan jadi 1 tampilan saja (dash, drag & drop) --
// satu-satunya pemakainya sekarang cuma halaman /upload (widget kembar
// di Overview sudah dibuang, lihat OVERVIEW_DECLUTTER_NOTES.md). Kalau
// nanti ternyata perlu dipakai lagi di tempat bertema lain, tinggal
// dikembalikan pola variant-nya dari riwayat git/zip sebelumnya.

import { useState } from "react";

interface UploadResult {
  status?: string;
  active_count?: number;
  needs_review_count?: number;
  duplicate_flag_count?: number;
  message?: string;
  error?: string;
}

type SourceKind = "csv" | "excel";

export function UploadCsvForm({ onUploaded }: { onUploaded?: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [sourceKind, setSourceKind] = useState<SourceKind>("csv");

  async function submitFile(f: File) {
    setUploading(true);
    setResult(null);

    const form = new FormData();
    form.append("file", f);

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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) submitFile(dropped);
  }

  const accept = sourceKind === "excel" ? ".xlsx,.xls" : ".csv";

  return (
    <div className="dash-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-lg">☁️</span>
        <p className="text-sm font-semibold text-dash-text">Upload Data</p>
      </div>
      <p className="mb-4 text-xs text-dash-muted">Tambah data transaksi dari file CSV/Excel</p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        style={{ borderColor: dragActive ? "var(--color-dash-accent)" : "var(--color-dash-border)" }}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-center transition"
      >
        <span className="text-2xl">📤</span>
        <p className="text-sm text-dash-text">Drag & drop file di sini</p>
        <p className="text-xs text-dash-muted">atau pilih file dari perangkat</p>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) submitFile(picked);
          }}
        />
        <span
          style={{ background: "var(--color-dash-accent)" }}
          className="mt-2 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white"
        >
          {uploading ? "Memproses..." : "+ Upload CSV / Excel"}
        </span>
      </label>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-dash-muted">Sumber Data</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <label className="flex items-center gap-1.5 text-dash-text">
            <input type="radio" name="source-kind" checked={sourceKind === "csv"} onChange={() => setSourceKind("csv")} />
            CSV
          </label>
          <label className="flex items-center gap-1.5 text-dash-text">
            <input type="radio" name="source-kind" checked={sourceKind === "excel"} onChange={() => setSourceKind("excel")} />
            Excel
          </label>
          <label title="Segera hadir -- belum ada integrasi langsung" className="flex cursor-not-allowed items-center gap-1.5 text-dash-muted opacity-50">
            <input type="radio" disabled />
            Google Sheets
          </label>
          <label title="Segera hadir -- belum ada integrasi langsung" className="flex cursor-not-allowed items-center gap-1.5 text-dash-muted opacity-50">
            <input type="radio" disabled />
            API
          </label>
        </div>
        <p className="mt-2 text-[11px] text-dash-muted">Format yang didukung: .csv, .xlsx, .xls</p>
      </div>

      <div className="mt-1 flex justify-end">
        <a href="/template-transaksi.csv" download className="text-xs font-medium text-dash-accent hover:underline">
          Unduh Template CSV
        </a>
      </div>

      {result?.error ? (
        <p className="mt-3 rounded bg-dash-red/10 px-3 py-2 text-sm text-dash-red">❌ {result.error}</p>
      ) : result ? (
        <div className="mt-3 rounded bg-dash-green/10 px-3 py-2 text-sm text-dash-green">
          <p>✅ {result.message}</p>
          {(result.needs_review_count ?? 0) > 0 && (
            <p className="mt-1 text-dash-amber">⚠️ {result.needs_review_count} transaksi butuh review sebelum masuk laporan.</p>
          )}
          {(result.duplicate_flag_count ?? 0) > 0 && (
            <p className="mt-1 text-dash-red">🔎 {result.duplicate_flag_count} kemungkinan duplikat ditemukan, cek halaman Transaksi.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
