"use client";

// Copy to: components/OverviewPage.tsx
//
// Dashboard admin. Dirampingkan 7 Sept 2026 (lihat OVERVIEW_DECLUTTER_NOTES.md)
// setelah versi sebelumnya (yang ngikutin mockup sidebar-navy 1:1) ternyata
// kepenuhan section yang tumpang tindih satu sama lain. Struktur sekarang:
//   1. Omzet per Periode -- hero, paling atas (efek psikologis, permintaan
//      eksplisit).
//   2. Butuh Perhatian -- NeedsReviewList/DuplicateFlagList, notifikasi
//      yang beneran perlu tindakan.
//   3. Aktivitas Terakhir -- ringkasan histori (upload, review, duplikat).
//   4. Ringkasan Bisnis -- metrik (Jumlah Transaksi/Barang Terjual/Produk
//      Aktif -- "Total Pendapatan" DIBUANG dari sini karena sudah
//      terwakili oleh kartu "Hari" di Omzet per Periode), grafik 14 hari,
//      transaksi terbaru, data inbox.
//
// Yang DIBUANG dari versi sebelumnya (semua alasannya sama: duplikat info
// dari section lain tanpa nambah value, atau cuma dekorasi ngikutin
// mockup tanpa kegunaan harian buat pemilik warung):
//   - 5 kartu Status Strip (Sistem Online/Data Terakhir Masuk/dst)
//   - Status Pipeline Sistem (statis, cuma marketing "sistem kami keren")
//   - Data Bermasalah (duplikat persis dari Butuh Perhatian di atas)
//   - Log Sistem (duplikat persis dari Aktivitas Terakhir, cuma beda gaya)
//   - Upload Data widget (sekarang cuma ada di /upload, bukan di sini juga)
//   - "Metode Pembayaran" placeholder kosong (belum ada datanya sama sekali)

import { useEffect, useState } from "react";
import Link from "next/link";
import { NeedsReviewList } from "./NeedsReviewList";
import { DuplicateFlagList } from "./DuplicateFlagList";
import { DataInboxList } from "./DataInboxList";
import { RecentActivityFeed } from "./RecentActivityFeed";
import { RevenueHero } from "./RevenueHero";

interface DashboardSummary {
  date: string;
  today: { orders: number; revenue: number; aov: number; items_sold: number };
  vs_yesterday: { revenue_pct: number | null; orders_pct: number | null; items_sold_pct: number | null };
  products: { active: number; total: number };
  low_stock_count: number;
  trend_14d: { date: string; revenue: number; orders: number }[];
  top_products_14d: { produk: string; qty: number }[];
}

interface RecentTxn {
  row_id: string;
  transaction_date: string;
  transaction_time: string | null;
  total_amount: number;
  status: "ACTIVE" | "NEEDS_REVIEW" | "VOID";
}

const STATUS_LABEL: Record<RecentTxn["status"], { text: string; className: string }> = {
  ACTIVE: { text: "Selesai", className: "bg-dash-green/15 text-dash-green" },
  NEEDS_REVIEW: { text: "Perlu Review", className: "bg-dash-amber/15 text-dash-amber" },
  VOID: { text: "Dibatalkan", className: "bg-dash-muted/15 text-dash-muted" },
};

export function OverviewPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentTxns, setRecentTxns] = useState<RecentTxn[]>([]);
  useEffect(() => {
    fetch("/api/dashboard-summary")
      .then((r) => r.json())
      .then(setSummary);
    fetch("/api/transactions")
      .then((r) => r.json())
      .then((rows: RecentTxn[]) => setRecentTxns(rows.slice(0, 5)));
  }, []);

  const maxRevenue = Math.max(...(summary?.trend_14d.map((t) => t.revenue) ?? [0]), 1);
  const hasTrendData = (summary?.trend_14d ?? []).some((t) => t.revenue > 0 || t.orders > 0);

  return (
    <div className="font-dash flex flex-col gap-5 p-4 sm:p-6">
      {/* 1. Omzet -- paling atas, efek psikologis (lihat catatan di atas) */}
      <RevenueHero />

      {/* 2. Butuh perhatian -- notifikasi sebenarnya (ada tombol aksi
          langsung) */}
      <div className="flex flex-col gap-4">
        <NeedsReviewList />
        <DuplicateFlagList />
      </div>

      {/* 3. Aktivitas Terakhir */}
      <div className="dash-card">
        <div className="flex items-center justify-between border-b border-dash-border p-4">
          <p className="text-sm font-semibold text-dash-text">Aktivitas Terakhir</p>
        </div>
        <RecentActivityFeed limit={8} />
      </div>

      {/* 4. Ringkasan Bisnis -- 3 stat disatukan dalam 1 kartu (bukan 3
          kartu terpisah seperti sebelumnya). Alasan (8 Sept 2026): 3 kartu
          terpisah, masing-masing isinya cuma 1 angka + label pendek, kelihatan
          jadi kotak putih besar dengan banyak ruang kosong -- berantakan,
          terutama pas layar tidak lebar-lebar amat. Pola "1 kartu, dibagi
          kolom" ini konsisten dengan RevenueHero di atas & lebih padat. */}
      <div className="mt-2 flex items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-dash-muted">Ringkasan Bisnis</p>
        <div className="h-px flex-1" style={{ background: "var(--color-dash-border)" }} />
      </div>

      <div className="dash-card grid grid-cols-1 divide-y divide-dash-border p-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <MiniStat
          icon="🛒"
          label="Jumlah Transaksi"
          value={summary ? String(summary.today.orders) : "..."}
          pct={summary?.vs_yesterday.orders_pct ?? null}
        />
        <MiniStat
          icon="🏷️"
          label="Barang Terjual"
          value={summary ? String(summary.today.items_sold) : "..."}
          pct={summary?.vs_yesterday.items_sold_pct ?? null}
        />
        <MiniStat
          icon="📦"
          label="Produk Aktif"
          value={summary ? String(summary.products.active) : "..."}
          sub={summary ? `dari ${summary.products.total} total produk` : undefined}
        />
      </div>

      <div className="dash-card p-5">
        <p className="text-sm font-semibold text-dash-text">Grafik Penjualan</p>
        <p className="mb-4 text-xs text-dash-muted">Performa penjualan 14 hari terakhir</p>
        {!summary ? (
          <p className="text-sm text-dash-muted">Memuat...</p>
        ) : hasTrendData ? (
          <div className="flex h-40 items-stretch gap-1.5">
            {summary.trend_14d.map((t) => (
              <div key={t.date} className="flex flex-1 flex-col justify-end gap-1">
                <div className="flex h-36 w-full items-end">
                  <div
                    title={`${t.date}: Rp${Math.round(t.revenue).toLocaleString("id-ID")}`}
                    style={{
                      height: `${Math.max((t.revenue / maxRevenue) * 100, 3)}%`,
                      background: "var(--color-dash-green)",
                    }}
                    className="w-full rounded-t-sm"
                  />
                </div>
                <span className="text-center text-[9px] text-dash-muted">{t.date.slice(-2)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-dash-muted">Belum ada transaksi 14 hari terakhir.</p>
        )}
      </div>

      <div className="dash-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-dash-text">Transaksi Terbaru</p>
          <Link href="/transactions" className="text-xs font-medium text-dash-accent hover:underline">
            Lihat semua →
          </Link>
        </div>
        {recentTxns.length === 0 ? (
          <p className="text-sm text-dash-muted">Belum ada transaksi.</p>
        ) : (
          <div className="flex flex-col">
            {recentTxns.map((t) => {
              const s = STATUS_LABEL[t.status];
              return (
                <div key={t.row_id} className="flex items-center justify-between border-b border-dash-border py-2.5 last:border-0">
                  <span className="text-sm text-dash-text">
                    {t.transaction_date} {t.transaction_time ?? ""}
                  </span>
                  <span className="text-sm font-medium text-dash-text">
                    Rp{Math.round(t.total_amount).toLocaleString("id-ID")}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${s.className}`}>{s.text}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DataInboxList />
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  pct,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  pct?: number | null;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3 px-0 py-3 first:pt-0 last:pb-0 sm:px-5 sm:py-0 sm:first:pl-0 sm:last:pr-0">
      <span className="text-xl">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-dash-muted">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-dash-text">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-dash-muted">{sub}</p>}
        {pct !== undefined && pct !== null && (
          <p className={`mt-0.5 text-xs font-medium ${pct >= 0 ? "text-dash-green" : "text-dash-red"}`}>
            {pct >= 0 ? "↑" : "↓"} {Math.abs(pct)}% <span className="font-normal text-dash-muted">vs kemarin</span>
          </p>
        )}
        {pct === null && <p className="mt-0.5 text-xs text-dash-muted">Data baru, belum ada pembanding</p>}
      </div>
    </div>
  );
}
