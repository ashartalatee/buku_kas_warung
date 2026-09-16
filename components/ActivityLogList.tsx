"use client";

// Copy to: components/ActivityLogList.tsx
//
// Linimasa read-only, pola UI sama dengan NeedsReviewList/ProductsList:
// plain fetch, state lokal, tanpa library eksternal. Tiap tipe event
// punya warna garis kiri sendiri (konsisten dengan pola dash-card--action
// yang sudah dipakai di seluruh dashboard) supaya jenis kejadian gampang
// dipindai sekilas tanpa perlu ikon baru.

import { useEffect, useState } from "react";

interface ActivityItem {
  id: string;
  type: "correction" | "void" | "stock_adjustment" | "upload" | "duplicate_resolved" | "trashed";
  message: string;
  detail?: string | null;
  performed_by: string;
  performed_at: string;
}

const TYPE_LABEL: Record<ActivityItem["type"], string> = {
  correction: "Koreksi",
  void: "Pembatalan",
  stock_adjustment: "Stok",
  upload: "Upload",
  duplicate_resolved: "Duplikat",
  trashed: "Sampah",
};

const TYPE_COLOR: Record<ActivityItem["type"], string> = {
  correction: "var(--color-dash-amber)",
  void: "var(--color-dash-red)",
  stock_adjustment: "var(--color-dash-blue)",
  upload: "var(--color-dash-green)",
  duplicate_resolved: "var(--color-dash-purple)",
  trashed: "var(--color-dash-red)",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityLogList() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/activity")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Gagal memuat activity log.");
        }
        return res.json();
      })
      .then(setItems)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="font-dash mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-semibold text-dash-text">Riwayat Aktivitas</h1>
        <p className="text-xs text-dash-muted">
          Riwayat koreksi, pembatalan, penyesuaian stok, upload, dan resolusi duplikat — 50 kejadian terbaru.
        </p>
      </div>

      {error && <p className="text-sm text-dash-red">{error}</p>}

      {!error && items === null && <p className="text-sm text-dash-muted">Memuat...</p>}

      {items !== null && items.length === 0 && (
        <p className="text-sm text-dash-muted">Belum ada aktivitas tercatat.</p>
      )}

      {items !== null && items.length > 0 && (
        <div className="flex flex-col gap-2">
          {(expanded ? items : items.slice(0, 3)).map((item) => (
            <div
              key={item.id}
              className="dash-card p-3"
              style={{ borderLeft: `3px solid ${TYPE_COLOR[item.type]}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-dash-text">{item.message}</p>
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold text-white"
                  style={{ background: TYPE_COLOR[item.type] }}
                >
                  {TYPE_LABEL[item.type]}
                </span>
              </div>
              {item.detail && <p className="mt-0.5 text-xs text-dash-muted">{item.detail}</p>}
              <p className="mt-1 text-[10px] text-dash-muted">
                {formatDateTime(item.performed_at)} · oleh {item.performed_by}
              </p>
            </div>
          ))}
          {items.length > 3 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="dash-card p-2 text-xs font-medium text-dash-accent hover:bg-dash-surface-2"
            >
              {expanded ? "Tampilkan lebih sedikit" : `Tampilkan semua (${items.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
