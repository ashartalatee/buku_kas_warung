"use client";

// Copy to: components/RevenueHero.tsx
//
// Banner omzet 4 periode, sengaja ditaruh PALING ATAS Overview (di atas
// alert "butuh perhatian") -- lihat diskusi 7 Sept 2026: tujuannya
// psikologis, angka besar ini yang pertama kena mata begitu halaman
// dibuka, sebelum apa pun lain. Semua "to date" (dari awal
// minggu/bulan/tahun kalender sampai hari ini), bukan trailing/retrospektif
// -- lihat metrics.ts getRevenueSummaryPeriods() untuk alasannya.
//
// Kalau data_since menunjukkan history-nya belum genap 1 tahun/bulan/
// minggu, kartu terkait dikasih keterangan kecil jujur ("baru berjalan
// sejak ...") -- supaya angka yang keliatan kecil (wajar untuk data
// baru/latihan) tidak disalahartikan sebagai sistem salah hitung.

import { useEffect, useState } from "react";

interface PeriodStat {
  revenue: number;
  orders: number;
}

interface RevenueSummary {
  date: string;
  day: PeriodStat;
  week: PeriodStat;
  month: PeriodStat;
  year: PeriodStat;
  data_since: string | null;
}

function formatRupiah(n: number): string {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

export function RevenueHero() {
  const [data, setData] = useState<RevenueSummary | null>(null);

  useEffect(() => {
    fetch("/api/revenue-summary")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (data && data.data_since === null) {
    // Belum ada transaksi ACTIVE sama sekali -- jujur tampilkan kosong,
    // bukan Rp0 di 4 kartu besar yang kelihatan seperti sistem error.
    return (
      <div className="dash-card p-6 text-center">
        <p className="text-sm text-dash-muted">Belum ada transaksi tercatat. Omzet akan muncul di sini setelah ada data masuk.</p>
      </div>
    );
  }

  const startedThisWeek = data && data.data_since && data.data_since > startOfWeek(data.date);
  const startedThisMonth = data && data.data_since && data.data_since > data.date.slice(0, 7) + "-01";
  const startedThisYear = data && data.data_since && data.data_since > data.date.slice(0, 4) + "-01-01";

  return (
    <div
      className="dash-card overflow-hidden p-5 sm:p-6"
      style={{ background: "linear-gradient(135deg, var(--color-dash-accent-soft), var(--color-dash-surface))" }}
    >
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-dash-muted">Omzet per Periode</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <HeroStat label="Hari" value={data?.day.revenue} />
        <HeroStat
          label="Minggu"
          value={data?.week.revenue}
          caption={startedThisWeek ? `sejak ${data!.data_since}` : "s/d hari ini"}
        />
        <HeroStat
          label="Bulan"
          value={data?.month.revenue}
          caption={startedThisMonth ? `sejak ${data!.data_since}` : "s/d hari ini"}
        />
        <HeroStat
          label="Tahun"
          value={data?.year.revenue}
          caption={startedThisYear ? `sejak ${data!.data_since}` : "s/d hari ini"}
        />
      </div>
    </div>
  );
}

function HeroStat({ label, value, caption }: { label: string; value?: number; caption?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-dash-muted">{label}</p>
      <p className="mt-1 truncate text-lg font-extrabold tracking-tight text-dash-text sm:text-xl md:text-3xl">
        {value !== undefined ? formatRupiah(value) : "..."}
      </p>
      {caption && <p className="mt-0.5 truncate text-[10px] text-dash-muted">{caption}</p>}
    </div>
  );
}

function startOfWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const dow = d.getUTCDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d.toISOString().slice(0, 10);
}
