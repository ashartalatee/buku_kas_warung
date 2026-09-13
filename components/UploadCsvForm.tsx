"use client";

// Copy to: components/UploadCsvForm.tsx
//
// Calls POST /api/transactions/upload. Always shows the real outcome
// returned by the API (how many ACTIVE vs NEEDS_REVIEW) — never a bare
// "berhasil!" — per the "never silently fail" principle from SPEC.md.
//
// Sampai 6 Sept 2026 komponen ini punya 2 tampilan (variant "ledger" lama
// & "dash" baru) karena dipakai di 2 tempat berbeda dengan tema berbeda.
// 7 Sept 2026: disederhanakan jadi 1 tampilan saja (dash, drag & drop).
//
// 8 Sept 2026: nambah pemilihan CHANNEL wajib sebelum bisa upload --
// awalnya channel cuma dibaca dari kolom teks bebas di CSV, tapi itu
// gampang salah/typo/lupa diisi (rawan dimanipulasi tanpa sengaja).
// Sekarang default-nya channel dikonfirmasi manusia lewat dropdown
// (dikirim sebagai channel_mode, override SEMUA baris di file ini) --
// kolom "channel" di CSV cuma dipakai kalau user secara SADAR pilih
// opsi "File ini campur beberapa channel". Lihat CHANNEL_FEATURE_NOTES.md.

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

const CHANNEL_OPTIONS = ["Shopee", "TikTok Shop", "Lazada", "WhatsApp", "Lainnya"];
const MIXED_VALUE = "MIXED_FROM_FILE";

export function UploadCsvForm({ onUploaded }: { onUploaded?: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [sourceKind, setSourceKind] = useState<SourceKind>("csv");
  const [channelMode, setChannelMode] = useState(""); // "" = belum dipilih, wajib diisi

  async function submitFile(f: File) {
    if (!channelMode) {
      setResult({ error: 'Pilih "Channel data ini dari mana" dulu di bawah, baru upload filenya.' });
      return;
    }

    setUploading(true);
    setResult(null);

    const form = new FormData();
    form.append("file", f);
    form.append("channel_mode", channelMode);

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
  const canUpload = channelMode !== "";

  return (
    <div className="dash-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: "var(--color-dash-accent-soft)", color: "var(--color-dash-accent)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15.5V4.5" /><path d="M7.5 9 12 4.5 16.5 9" /><path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
          </svg>
        </span>
        <p className="text-sm font-semibold text-dash-text">Upload Data</p>
      </div>
      <p className="mb-4 text-xs text-dash-muted">Tambah data transaksi dari file CSV/Excel</p>

      {/* Channel WAJIB dipilih sebelum upload -- dropdown ini, bukan teks
          bebas di CSV, yang jadi sumber kebenaran channel (lihat catatan
          di atas komponen ini). */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-dash-text">
          Channel data ini dari mana? <span className="text-dash-red">*</span>
        </label>
        <select
          value={channelMode}
          onChange={(e) => setChannelMode(e.target.value)}
          className="w-full rounded-md border border-dash-border bg-dash-surface px-3 py-2 text-sm text-dash-text outline-none focus:border-dash-accent"
        >
          <option value="">-- Pilih dulu --</option>
          {CHANNEL_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value={MIXED_VALUE}>File ini campur beberapa channel (pakai kolom &quot;channel&quot; di file)</option>
        </select>
        <p className="mt-1 text-[11px] text-dash-muted">
          {channelMode && channelMode !== MIXED_VALUE
            ? `Semua transaksi di file ini akan dicatat sebagai channel "${channelMode}", terlepas dari isi kolom apapun di file.`
            : channelMode === MIXED_VALUE
              ? 'Pastikan file punya kolom "channel" terisi tiap barisnya -- baris yang kosong otomatis jadi "Lainnya".'
              : "Biasanya 1 file = 1 channel (mis. laporan yang di-download dari Shopee Seller Center), jadi pilih langsung nama channel-nya."}
        </p>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (canUpload) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        style={{
          borderColor: dragActive ? "var(--color-dash-accent)" : "var(--color-dash-border)",
          opacity: canUpload ? 1 : 0.5,
          cursor: canUpload ? "pointer" : "not-allowed",
        }}
        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-center transition"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-dash-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 15.5V4.5" /><path d="M7.5 9 12 4.5 16.5 9" /><path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
        </svg>
        <p className="text-sm text-dash-text">Drag & drop file di sini</p>
        <p className="text-xs text-dash-muted">atau pilih file dari perangkat</p>
        <input
          type="file"
          accept={accept}
          disabled={!canUpload}
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
        <p className="mt-3 rounded bg-dash-red/10 px-3 py-2 text-sm text-dash-red">{result.error}</p>
      ) : result ? (
        <div className="mt-3 rounded bg-dash-green/10 px-3 py-2 text-sm text-dash-green">
          <p>{result.message}</p>
          {(result.needs_review_count ?? 0) > 0 && (
            <p className="mt-1 text-dash-amber">{result.needs_review_count} transaksi butuh review sebelum masuk laporan.</p>
          )}
          {(result.duplicate_flag_count ?? 0) > 0 && (
            <p className="mt-1 text-dash-red">{result.duplicate_flag_count} kemungkinan duplikat ditemukan, cek halaman Transaksi.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
