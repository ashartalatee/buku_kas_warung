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

  if (loading) return <p className="text-sm text-neutral-400">Memuat...</p>;
  if (items.length === 0) return null; // nothing needs review — show nothing, not an empty state banner

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <p className="mb-3 text-sm font-medium text-amber-800">
        ⚠️ {items.length} transaksi perlu diperiksa
      </p>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.row_id} className="rounded-lg border border-amber-200 bg-white p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">
                  {item.transaction_date} {item.transaction_time ?? ""}
                </p>
                <p className="mt-1 text-xs text-amber-700">{item.validation_notes}</p>
              </div>
              {editingId !== item.row_id && (
                <button
                  onClick={() => {
                    setEditingId(item.row_id);
                    setEditValue(String(item.total_amount));
                  }}
                  className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-medium"
                >
                  Perbaiki
                </button>
              )}
            </div>

            {editingId === item.row_id && (
              <div className="mt-3 flex items-center gap-2 border-t border-amber-100 pt-3">
                <span className="text-xs text-neutral-500">Total benar (Rp)</span>
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-32 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                  autoFocus
                />
                <button
                  onClick={() => submitFix(item.row_id)}
                  className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white"
                >
                  Simpan
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded-md px-3 py-1 text-xs text-neutral-500"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
