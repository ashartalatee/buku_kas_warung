"use client";

// Copy to: components/RecentActivityFeed.tsx
//
// Feed aktivitas gabungan untuk "Aktivitas Terakhir" di Overview. SEMUA
// entri di sini nyata, diambil dari 3 sumber yang sudah ada:
//   - /api/sources      (file diupload + hasil prosesnya)
//   - /api/needs-review (transaksi yang butuh review)
//   - /api/duplicates   (kemungkinan duplikat ditemukan)
// Tidak ada "automation started", "database backup completed", dkk yang
// dikarang -- kalau nanti ada sumber data event untuk itu, tinggal
// ditambah di sini, bukan diisi contoh dari mockup.
//
// 7 Sept 2026: tadinya komponen ini punya 2 variant tampilan ("timeline"
// buat "Aktivitas Terakhir" & "log" buat "Log Sistem") karena dulu
// nempel di 2 section berbeda. "Log Sistem" dibuang (isinya data SAMA
// PERSIS dengan "Aktivitas Terakhir", cuma beda gaya render -- setelah
// dipikir ulang itu bukan variasi UX yang berguna, cuma bikin Overview
// penuh) -- lihat OVERVIEW_DECLUTTER_NOTES.md. Sekarang cuma 1 tampilan.

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

interface ReviewItem {
  row_id: string;
  validation_notes: string;
  created_at: string;
}

interface DuplicateFlag {
  flag_id: string;
  match_score: number;
  created_at: string;
}

interface ActivityEntry {
  id: string;
  time: string; // ISO
  title: string;
  subtitle: string;
  badge: "Sukses" | "Peringatan" | "Gagal";
}

function badgeClass(badge: ActivityEntry["badge"]): string {
  if (badge === "Sukses") return "bg-dash-green/15 text-dash-green";
  if (badge === "Gagal") return "bg-dash-red/15 text-dash-red";
  return "bg-dash-amber/15 text-dash-amber";
}

export function RecentActivityFeed({ limit = 8 }: { limit?: number }) {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/sources").then((r) => (r.ok ? r.json() : [])) as Promise<SourceRow[]>,
      fetch("/api/needs-review").then((r) => (r.ok ? r.json() : [])) as Promise<ReviewItem[]>,
      fetch("/api/duplicates").then((r) => (r.ok ? r.json() : [])) as Promise<DuplicateFlag[]>,
    ])
      .then(([sources, reviews, duplicates]) => {
        const fromSources: ActivityEntry[] = sources.map((s) => ({
          id: `source-${s.source_id}`,
          time: s.uploaded_at,
          title:
            s.status === "COMPLETED"
              ? "Data transaksi berhasil diproses"
              : s.status === "FAILED"
                ? "Upload file gagal diproses"
                : "File transaksi diupload",
          subtitle:
            s.status === "COMPLETED"
              ? `${s.original_filename} · ${s.processed_row_count}/${s.row_count ?? "?"} baris diproses`
              : s.status === "FAILED"
                ? `${s.original_filename} · ${s.failure_reason ?? "alasan tidak diketahui"}`
                : s.original_filename,
          badge: s.status === "COMPLETED" ? "Sukses" : s.status === "FAILED" ? "Gagal" : "Peringatan",
        }));

        const fromReviews: ActivityEntry[] = reviews.map((r) => ({
          id: `review-${r.row_id}`,
          time: r.created_at,
          title: "Transaksi ditandai perlu diperiksa",
          subtitle: r.validation_notes,
          badge: "Peringatan",
        }));

        const fromDuplicates: ActivityEntry[] = duplicates.map((d) => ({
          id: `dup-${d.flag_id}`,
          time: d.created_at,
          title: "Kemungkinan duplikat ditemukan",
          subtitle: `Skor kemiripan ${d.match_score}`,
          badge: "Peringatan",
        }));

        const merged = [...fromSources, ...fromReviews, ...fromDuplicates]
          .filter((e) => e.time)
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          .slice(0, limit);

        setEntries(merged);
      })
      .catch(() => setEntries([]));
  }, [limit]);

  if (entries === null) return <p className="p-4 text-sm text-dash-muted">Memuat...</p>;
  if (entries.length === 0) return <p className="p-4 text-sm text-dash-muted">Belum ada aktivitas.</p>;

  return (
    <div className="flex flex-col">
      {entries.map((e) => (
        <div key={e.id} className="flex items-start gap-3 border-b border-dash-border px-4 py-3 last:border-0">
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
            style={{
              background:
                e.badge === "Sukses" ? "var(--color-dash-green)" : e.badge === "Gagal" ? "var(--color-dash-red)" : "var(--color-dash-amber)",
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-dash-muted">{formatClock(e.time)}</p>
            <p className="text-sm font-medium text-dash-text">{e.title}</p>
            <p className="truncate text-xs text-dash-muted">{e.subtitle}</p>
          </div>
          <span className={`shrink-0 self-center rounded px-2 py-0.5 text-xs font-medium ${badgeClass(e.badge)}`}>{e.badge}</span>
        </div>
      ))}
    </div>
  );
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(d);
}
