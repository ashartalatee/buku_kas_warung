"use client";

// Copy to: components/DuplicateFlagList.tsx
//
// Fetches GET /api/duplicates (PENDING flags) and lets the user resolve
// each: "Ini duplikat" confirms + voids the candidate (reason:
// "Duplikat"); "Ini transaksi baru" just dismisses the flag. Per
// SPEC.md §6, this never auto-merges — the choice is always the
// user's, and both transactions stay in the database either way.

import { useEffect, useState } from "react";

interface DuplicateFlag {
  flag_id: string;
  transaction_row_id: string;
  candidate_row_id: string;
  match_score: number;
  matched_fields: string; // JSON array as text, see src/schema.sql
}

export function DuplicateFlagList() {
  const [flags, setFlags] = useState<DuplicateFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/duplicates");
    setFlags(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function markAsDuplicate(flag: DuplicateFlag) {
    setBusyId(flag.flag_id);
    // 1. record the human decision on the flag
    await fetch(`/api/duplicates/${flag.flag_id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution: "CONFIRMED_DUPLICATE" }),
    });
    // 2. void the candidate (the earlier of the two) — the newer
    //    transaction_row_id stays ACTIVE
    await fetch(`/api/transactions/${flag.candidate_row_id}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Duplikat" }),
    });
    setBusyId(null);
    load();
  }

  async function markAsNew(flag: DuplicateFlag) {
    setBusyId(flag.flag_id);
    await fetch(`/api/duplicates/${flag.flag_id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution: "CONFIRMED_NEW" }),
    });
    setBusyId(null);
    load();
  }

  if (loading) return <p className="text-sm text-neutral-400">Memuat...</p>;
  if (flags.length === 0) return null;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
      <p className="mb-3 text-sm font-medium text-red-800">
        🔎 {flags.length} kemungkinan duplikat ditemukan
      </p>

      <div className="flex flex-col gap-3">
        {flags.map((flag) => {
          const fields: string[] = JSON.parse(flag.matched_fields || "[]");
          return (
            <div key={flag.flag_id} className="rounded-lg border border-red-200 bg-white p-3">
              <p className="mb-2 text-xs text-neutral-500">
                Cocok pada: {fields.join(", ")} (skor {flag.match_score})
              </p>
              <div className="flex gap-2">
                <button
                  disabled={busyId === flag.flag_id}
                  onClick={() => markAsDuplicate(flag)}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-medium text-white disabled:opacity-40"
                >
                  Ini duplikat
                </button>
                <button
                  disabled={busyId === flag.flag_id}
                  onClick={() => markAsNew(flag)}
                  className="flex-1 rounded-lg border border-neutral-300 py-2 text-xs font-medium disabled:opacity-40"
                >
                  Ini transaksi baru
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
