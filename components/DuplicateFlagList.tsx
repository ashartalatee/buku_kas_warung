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

// Nama field database (date/line_item_count/dst) tidak boleh sampai
// terlihat mentah oleh pemilik warung -- diterjemahkan jadi kalimat biasa.
// Angka skor (0-100, ambang flag = 80) juga sengaja TIDAK ditampilkan --
// karena semua yang di-flag pasti sudah >=80, angka itu tidak menambah
// kejelasan buat orang awam, cuma menambah istilah asing.
const FIELD_LABELS: Record<string, string> = {
  date: "tanggal",
  time: "jam",
  total: "jumlah total",
  line_item_count: "jumlah barang",
  items: "daftar barang",
};

function describeMatch(fields: string[]): string {
  const labels = fields.map((f) => FIELD_LABELS[f] ?? f);
  if (labels.length === 0) return "Transaksi ini mirip dengan transaksi lain.";
  const [first, ...rest] = labels;
  const capitalized = first.charAt(0).toUpperCase() + first.slice(1);
  if (rest.length === 0) return `${capitalized} sama persis dengan transaksi lain.`;
  const last = rest[rest.length - 1];
  const middle = rest.slice(0, -1);
  const joined = [capitalized, ...middle].join(", ");
  return `${joined}, dan ${last} sama persis dengan transaksi lain.`;
}

export function DuplicateFlagList() {
  const [flags, setFlags] = useState<DuplicateFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

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

  if (loading) return <p className="text-sm text-dash-muted">Memuat...</p>;
  if (flags.length === 0) return null;

  const visible = expanded ? flags : flags.slice(0, 2);

  return (
    <div className="dash-card dash-card--action" style={{ "--accent": "var(--color-dash-red)" } as React.CSSProperties}>
      <p className="border-b border-dash-border p-4 text-sm font-medium text-dash-red">
        {flags.length} kemungkinan duplikat ditemukan
      </p>

      <div>
        {visible.map((flag) => {
          const fields: string[] = JSON.parse(flag.matched_fields || "[]");
          return (
            <div key={flag.flag_id} className="flex flex-col gap-2 border-b border-dash-border p-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-dash-muted">{describeMatch(fields)}</p>
              <div className="flex shrink-0 gap-2">
                <button
                  disabled={busyId === flag.flag_id}
                  onClick={() => markAsDuplicate(flag)}
                  className="rounded px-2.5 py-1 text-xs font-medium text-dash-red hover:bg-dash-surface-2 disabled:opacity-40"
                >
                  Duplikat
                </button>
                <button
                  disabled={busyId === flag.flag_id}
                  onClick={() => markAsNew(flag)}
                  className="rounded border border-dash-border px-2.5 py-1 text-xs font-medium text-dash-text hover:bg-dash-surface-2 disabled:opacity-40"
                >
                  Baru
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {flags.length > 2 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full border-t border-dash-border p-2 text-xs font-medium text-dash-amber hover:bg-dash-surface-2"
        >
          {expanded ? "Tampilkan lebih sedikit" : `Tampilkan semua (${flags.length})`}
        </button>
      )}
    </div>
  );
}
