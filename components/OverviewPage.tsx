"use client";

// Copy to: components/OverviewPage.tsx (or directly into app/(dashboard)/page.tsx)
//
// Assembles the Overview page per SPEC.md §8's "control center" model
// and the placement rule from SPEC.md §13: Needs Review and Potential
// Duplicate surface here (action required), Data Inbox surfaces here
// too (per §8's own definition — "file saya sudah masuk?" belongs on
// Overview, not buried). Correction history is deliberately NOT
// repeated here — that lives inline on the Transactions page.
//
// Today's metrics (Revenue/Orders/AOV) reuse the same visual language
// as the existing "Buku Kas Warung" dashboard — this component only
// adds the sections that dashboard didn't have yet.

import { useEffect, useState } from "react";
import { UploadCsvForm } from "./UploadCsvForm";
import { NeedsReviewList } from "./NeedsReviewList";
import { DuplicateFlagList } from "./DuplicateFlagList";
import { DataInboxList } from "./DataInboxList";

interface DailyMetrics {
  date: string;
  orders: number;
  revenue: number;
  aov: number;
}

export function OverviewPage() {
  const [metrics, setMetrics] = useState<DailyMetrics | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function loadMetrics() {
    const res = await fetch("/api/metrics/daily");
    setMetrics(await res.json());
  }

  useEffect(() => {
    loadMetrics();
  }, [refreshKey]);

  function refreshAll() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      {/* Today's numbers — same shape as the existing dashboard */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <p className="mb-3 text-xs uppercase tracking-wide text-neutral-400">
          Hari ini{metrics ? ` — ${metrics.date}` : ""}
        </p>
        {metrics ? (
          <div className="flex flex-col gap-2">
            <Row label="Jumlah transaksi" value={String(metrics.orders)} />
            <Row label="Rata-rata belanja (AOV)" value={`Rp${metrics.aov.toLocaleString("id-ID")}`} />
            <Row label="Total pendapatan" value={`Rp${metrics.revenue.toLocaleString("id-ID")}`} bold />
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Memuat...</p>
        )}
      </div>

      {/* Action-required sections — must be visible immediately, per SPEC.md §13 */}
      <NeedsReviewList key={`review-${refreshKey}`} />
      <DuplicateFlagList key={`dup-${refreshKey}`} />

      {/* Data entry */}
      <UploadCsvForm onUploaded={refreshAll} />

      {/* "File saya sudah masuk?" */}
      <DataInboxList key={`inbox-${refreshKey}`} onRetry={refreshAll} />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 pb-2 last:border-0">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className={bold ? "text-lg font-semibold text-emerald-700" : "text-sm font-medium"}>
        {value}
      </span>
    </div>
  );
}
