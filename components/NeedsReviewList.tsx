"use client";

// Copy to: components/NeedsReviewList.tsx
//
// Fetches GET /api/needs-review and lets the user fix each row via
// POST /api/needs-review/{rowId}/resolve. This calls
// resolveNeedsReview() under the hood — NOT createCorrection() — so
// fixing a row here never touches the Orders count until the fix
// itself makes it ACTIVE for the first time (see flows/02).
//
// Per SPEC.md §8, this belongs on the Overview page, not a submenu.

import { useEffect, useState } from "react";

interface ReviewItem {
  row_id: string;
  transaction_date: string;
  transaction_time: string | null;
  total_amount: number;
  validation_notes: string;
}

export function NeedsReviewList() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/needs-review");
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function submitFix(row_id: string) {
    setError(null);
    const total_amount = Number(editValue);
    if (isNaN(total_amount) || total_amount <= 0) {
      setError("Masukkan nilai total yang valid.");
      return;
    }

    const res = await fetch(`/api/needs-review/${row_id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total_amount }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal menyimpan perbaikan.");
      return; // row stays in the list — still NEEDS_REVIEW, per the API contract
    }

    setEditingId(null);
    setEditValue("");
    load(); // refresh the queue
  }

  if (loading) return <p className="text-sm text-dash-muted">Memuat...</p>;
  if (items.length === 0) return null; // nothing needs review — show nothing, not an empty state banner

  const visible = expanded ? items : items.slice(0, 5);

  return (
    <div className="dash-card dash-card--action font-dash" style={{ "--accent": "var(--color-dash-amber)" } as React.CSSProperties}>
      <p className="border-b border-dash-border p-4 text-sm font-medium text-dash-amber">
        ⚠️ {items.length} transaksi perlu diperiksa
      </p>

      <div>
        {visible.map((item) => (
          <div key={item.row_id} className="border-b border-dash-border p-3 last:border-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-dash-text">
                  {item.transaction_date} {item.transaction_time ?? ""}
                </p>
                <p className="mt-1 text-xs text-dash-amber">{item.validation_notes}</p>
              </div>
              {editingId !== item.row_id && (
                <button
                  onClick={() => {
                    setEditingId(item.row_id);
                    setEditValue(String(item.total_amount));
                  }}
                  className="self-start rounded border border-dash-border px-2.5 py-1 text-xs font-medium text-dash-text hover:bg-dash-surface-2 sm:shrink-0"
                >
                  Perbaiki
                </button>
              )}
            </div>

            {editingId === item.row_id && (
              <div className="mt-3 flex items-center gap-2 border-t border-dash-border pt-3">
                <span className="text-xs text-dash-muted">Total benar (Rp)</span>
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-32 rounded border border-dash-border bg-dash-surface px-2 py-1 text-sm text-dash-text outline-none focus:border-dash-amber"
                  autoFocus
                />
                <button
                  onClick={() => submitFix(item.row_id)}
                  className="rounded bg-dash-amber px-3 py-1 text-xs font-medium text-black hover:brightness-110"
                >
                  Simpan
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded px-3 py-1 text-xs text-dash-muted"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {items.length > 5 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full border-t border-dash-border p-2 text-xs font-medium text-dash-amber hover:bg-dash-surface-2"
        >
          {expanded ? "Tampilkan lebih sedikit" : `Tampilkan semua (${items.length})`}
        </button>
      )}

      {error && <p className="border-t border-dash-border p-3 text-sm text-dash-red">{error}</p>}
    </div>
  );
}
