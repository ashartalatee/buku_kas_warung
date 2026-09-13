"use client";

// Copy to: components/RevenueByChannel.tsx
//
// "Omzet per Channel" (8 Sept 2026) -- hasil diskusi soal client
// multi-marketplace (Shopee/TikTok Shop/Lazada/WhatsApp/dst). Client
// single-channel akan tetap lihat kartu ini, cuma isinya 1 baris saja
// (mis. "Shopee 100%") -- tidak mengganggu, cuma tidak terlalu berguna
// buat mereka, dan itu wajar.
//
// Total yang ditampilkan bukan dijumlah di frontend, tapi langsung dari
// getRevenueByChannel() di backend -- 1 sumber angka, tidak ada resiko
// beda pembulatan antara "total" dan "jumlah semua baris channel".

import { useEffect, useState } from "react";

interface ChannelRow {
  channel: string;
  orders: number;
  revenue: number;
}

interface ChannelResponse {
  period: string;
  channels: ChannelRow[];
  total: number;
}

const PERIODS: { key: string; label: string }[] = [
  { key: "day", label: "Hari" },
  { key: "week", label: "Minggu" },
  { key: "month", label: "Bulan" },
  { key: "year", label: "Tahun" },
];

function formatRupiah(n: number): string {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

// Warna bar per channel -- disiklus dari palet dash yang sudah ada,
// bukan warna baru, supaya tetap konsisten sama komponen lain.
const BAR_COLORS = [
  "var(--color-dash-accent)",
  "var(--color-dash-green)",
  "var(--color-dash-amber)",
  "var(--color-dash-purple)",
  "var(--color-dash-red)",
  "var(--color-dash-blue)",
];

export function RevenueByChannel() {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState<ChannelResponse | null>(null);

  useEffect(() => {
    setData(null);
    fetch(`/api/revenue-by-channel?period=${period}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, [period]);

  return (
    <div className="dash-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-dash-text">Omzet per Channel</p>
        <div className="flex gap-1 rounded-md bg-dash-surface-2 p-0.5 text-xs">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded px-2.5 py-1 font-medium transition ${
                period === p.key ? "bg-dash-surface text-dash-text shadow-sm" : "text-dash-muted"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {data === null ? (
        <p className="text-sm text-dash-muted">Memuat...</p>
      ) : data.channels.length === 0 ? (
        <p className="text-sm text-dash-muted">Belum ada transaksi di periode ini.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.channels.map((c, i) => {
            const pct = data.total > 0 ? (c.revenue / data.total) * 100 : 0;
            return (
              <div key={c.channel}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-dash-text">{c.channel}</span>
                  <span className="text-dash-muted">
                    {formatRupiah(c.revenue)} <span className="text-xs">({pct.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-dash-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(pct, 2)}%`, background: BAR_COLORS[i % BAR_COLORS.length] }}
                  />
                </div>
              </div>
            );
          })}

          <div className="mt-1 flex items-center justify-between border-t border-dash-border pt-3 text-sm">
            <span className="font-semibold text-dash-text">Total</span>
            <span className="font-bold text-dash-text">{formatRupiah(data.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
