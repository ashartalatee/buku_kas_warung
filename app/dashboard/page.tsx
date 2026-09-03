"use client";

// Halaman dashboard yang dibuka lewat link di WhatsApp (bukan halaman
// kerja/admin -- ini "wajah" yang dilihat pemilik warung / calon
// klien). Gaya visual sengaja meniru nota/buku kas: font monospace,
// kertas krem, aksen hijau (uang masuk) & emas (sorotan).
//
// Dibuka dengan /dashboard?key=XXXX -- key dicek di proxy.ts terhadap
// DASHBOARD_SHARE_KEY. Kalau key salah/hilang, proxy sudah menolak
// sebelum halaman ini sempat render.

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface TrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  produk: string;
  qty_terjual: number;
}

interface Overview {
  business_name: string;
  today: { date: string; orders: number; revenue: number; aov: number };
  trend_14d: TrendPoint[];
  top_products_14d: TopProduct[];
  week: { periode: string; total_orders: number; total_revenue: number };
  busiest_slot: { day: string; hour_start: string | null; hour_end: string | null } | null;
  generated_at: string;
}

function formatRupiah(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

function formatTanggalID(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

const RANK_COLORS = ["#c0392b", "#c8862a", "#c8862a", "#c8862a", "#c8862a"];

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DashboardInner />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <div
      style={{ background: "#f3efe0", minHeight: "100vh" }}
      className="flex items-center justify-center font-mono text-sm text-neutral-500"
    >
      Memuat dashboard...
    </div>
  );
}

function DashboardInner() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key") ?? "";
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<string>("");

  async function load() {
    setError(null);
    try {
      const res = await fetch(`/api/reports/overview?key=${encodeURIComponent(key)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Gagal memuat data dashboard.");
        return;
      }
      setData(await res.json());
      setLoadedAt(
        new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    } catch {
      setError("Tidak bisa menghubungi server.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div
        style={{ background: "#f3efe0", minHeight: "100vh" }}
        className="flex items-center justify-center p-6 font-mono text-sm text-neutral-600"
      >
        <div className="max-w-xs text-center">
          <p className="mb-3">{error}</p>
          <button
            onClick={load}
            className="rounded bg-[#142850] px-4 py-2 text-xs font-semibold text-white"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  if (!data) return <LoadingScreen />;

  const maxRevenue = Math.max(...data.trend_14d.map((t) => t.revenue), 1);

  return (
    <div
      style={{
        background: "#f3efe0",
        backgroundImage:
          "repeating-linear-gradient(180deg, rgba(20,40,80,0.035) 0px, rgba(20,40,80,0.035) 1px, transparent 1px, transparent 27px)",
        minHeight: "100vh",
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      }}
      className="pb-10 text-[#2b2a25]"
    >
      {/* Header navy */}
      <div style={{ background: "#142850" }} className="px-6 py-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-slate-400">TALATEE AUTOMATION LAB</p>
            <h1
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              className="mt-1 text-3xl font-bold leading-tight"
            >
              {data.business_name}
            </h1>
            <p className="mt-1 text-xs text-slate-300">Dicatat otomatis, dibuka kapan saja.</p>
          </div>
          <div
            style={{ borderColor: "#c0392b" }}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border"
          >
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> LIVE
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 pt-5">
        {/* Hari ini */}
        <SectionLabel>{`HARI INI — ${formatTanggalID(data.today.date)}`}</SectionLabel>
        <Card>
          <Row label="Jumlah transaksi" value={String(data.today.orders)} />
          <Row label="Rata-rata belanja (AOV)" value={formatRupiah(data.today.aov)} />
          <div className="my-2 border-t border-dashed border-[#d8d2bd]" />
          <Row
            label="Total Pendapatan"
            value={formatRupiah(data.today.revenue)}
            big
            color="#1f7a4f"
          />
        </Card>

        {/* Tren 14 hari */}
        <SectionLabel>TREN 14 HARI TERAKHIR</SectionLabel>
        <Card>
          <div className="flex h-32 items-end gap-1.5">
            {data.trend_14d.map((t) => (
              <div key={t.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  title={`${t.date}: ${formatRupiah(t.revenue)}`}
                  style={{
                    height: `${Math.max((t.revenue / maxRevenue) * 100, 3)}%`,
                    background: "#1f7a4f",
                  }}
                  className="w-full rounded-t-sm"
                />
                <span className="text-[9px] text-neutral-400">{t.date.slice(-2)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Produk terlaris */}
        <SectionLabel>PRODUK TERLARIS (14 HARI)</SectionLabel>
        <Card padded={false}>
          {data.top_products_14d.length === 0 ? (
            <p className="p-4 text-xs text-neutral-400">Belum ada data produk.</p>
          ) : (
            data.top_products_14d.map((p, i) => (
              <div
                key={p.produk}
                className="flex items-center justify-between px-4 py-3 last:border-0"
                style={{ borderBottom: i < data.top_products_14d.length - 1 ? "1px solid #ece6d3" : undefined }}
              >
                <span className="flex items-center gap-3 text-sm">
                  <span style={{ color: RANK_COLORS[i] ?? "#c8862a" }} className="font-bold">
                    {i + 1}.
                  </span>
                  {p.produk}
                </span>
                <span style={{ color: "#1f7a4f" }} className="text-sm font-bold">
                  {p.qty_terjual}x
                </span>
              </div>
            ))
          )}
        </Card>

        {/* Minggu ini */}
        <SectionLabel>{`MINGGU INI — ${data.week.periode}`}</SectionLabel>
        <Card>
          <Row label="Transaksi" value={String(data.week.total_orders)} />
          <div className="my-2 border-t border-[#2b2a25]" />
          <Row label="Total Pendapatan" value={formatRupiah(data.week.total_revenue)} big color="#1f7a4f" />
        </Card>

        {/* Catatan toko */}
        {data.busiest_slot && (
          <div
            style={{ background: "#fbf1d9", borderColor: "#d8b25c" }}
            className="mt-4 rounded-lg border px-4 py-3 text-xs leading-relaxed"
          >
            <span style={{ color: "#a9720f" }} className="font-bold">
              Catatan toko:{" "}
            </span>
            paling ramai hari{" "}
            <span style={{ color: "#a9720f" }} className="font-bold">
              {data.busiest_slot.day}
            </span>
            {data.busiest_slot.hour_start && (
              <>
                , jam{" "}
                <span style={{ color: "#a9720f" }} className="font-bold">
                  {data.busiest_slot.hour_start} - {data.busiest_slot.hour_end}
                </span>
              </>
            )}
            .
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-[10px] text-neutral-400">
          <p>Terakhir dimuat: {loadedAt}</p>
          <p>Talatee Automation Lab — Bizintelli Engine</p>
        </div>
        <div className="mt-4 flex justify-center">
          <button
            onClick={load}
            style={{ background: "#142850" }}
            className="rounded-md px-5 py-2 text-xs font-semibold text-white"
          >
            Muat ulang
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-2 mt-5 flex items-center gap-2 text-[11px] tracking-[0.15em] text-neutral-500">
      <span>{children}</span>
      <span className="h-px flex-1 border-t border-dashed border-neutral-300" />
    </div>
  );
}

function Card({ children, padded = true }: { children: React.ReactNode; padded?: boolean }) {
  return (
    <div
      style={{ background: "#fbfaf3", borderColor: "#e6e0c9" }}
      className={`rounded-lg border ${padded ? "p-4" : ""}`}
    >
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  big,
  color,
}: {
  label: string;
  value: string;
  big?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-neutral-500">{label}</span>
      <span
        style={color ? { color } : undefined}
        className={big ? "text-xl font-bold" : "text-sm font-semibold"}
      >
        {value}
      </span>
    </div>
  );
}
