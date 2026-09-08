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

const RANK_COLORS = ["#a5271b", "#a66a10", "#a66a10", "#a66a10", "#a66a10"];

// Sapaan berdasarkan jam di perangkat SI PEMBUKA link (bukan jam server) --
// wajar, karena yang lihat halaman ini ya orang yang buka link-nya saat itu.
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 10) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

// Auto-refresh diam-diam supaya badge "LIVE" di header itu jujur --
// tanpa ini, data cuma "benar saat halaman dibuka", bukan benar-benar live.
const AUTO_REFRESH_MS = 60_000;

export default function DashboardPage() {
  return (
    <Suspense fallback={<SkeletonScreen />}>
      <DashboardInner />
    </Suspense>
  );
}

// Skeleton yang meniru bentuk halaman asli (header + kartu-kartu), bukan
// cuma teks "Memuat..." -- ini yang paling kentara bedanya antara dashboard
// yang terasa "jadi" vs yang terasa masih prototipe.
function SkeletonScreen() {
  return (
    <div style={{ background: "#f3efe0", minHeight: "100vh" }} className="pb-10">
      <div style={{ background: "#142850" }} className="px-6 py-6">
        <div className="mx-auto max-w-md">
          <div className="h-2.5 w-32 animate-pulse rounded bg-white/20" />
          <div className="mt-3 h-7 w-40 animate-pulse rounded bg-white/20" />
          <div className="mt-2 h-2.5 w-48 animate-pulse rounded bg-white/10" />
        </div>
      </div>
      <div className="mx-auto max-w-md px-4 pt-5">
        {[88, 128, 168].map((h, i) => (
          <div key={i} className="mt-5">
            <div className="mb-2 h-2.5 w-40 animate-pulse rounded bg-neutral-300/60" />
            <div
              style={{ height: h, background: "#fffdf8", borderColor: "#c9b98a" }}
              className="animate-pulse rounded-lg border"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardInner() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key") ?? "";
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  async function load(opts: { silent?: boolean } = {}) {
    if (opts.silent) setRefreshing(true);
    else setError(null);
    try {
      const res = await fetch(`/api/reports/overview?key=${encodeURIComponent(key)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // Kalau ini refresh diam-diam dan sudah ada data lama, jangan timpa
        // layar dengan pesan error -- biarkan data terakhir tetap tampil,
        // gagal-senyap lebih baik daripada dashboard tiba-tiba "hilang".
        if (!opts.silent) setError(body.error ?? "Gagal memuat data dashboard.");
        return;
      }
      setData(await res.json());
      setLoadedAt(
        new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
      if (!opts.silent) setError(null);
    } catch {
      if (!opts.silent) setError("Tidak bisa menghubungi server.");
    } finally {
      if (opts.silent) setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(() => load({ silent: true }), AUTO_REFRESH_MS);
    return () => clearInterval(id);
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
            onClick={() => load()}
            className="rounded bg-[#142850] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1c3a6b]"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  if (!data) return <SkeletonScreen />;

  const hasTrendData = data.trend_14d.some((t) => t.revenue > 0 || t.orders > 0);
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
      {/* Header navy -- background melebar penuh, tapi ISINYA dibatasi
          max-w-md yang SAMA dengan konten di bawah (lihat wrapper di baris
          ~200), supaya judul & kartu rata kiri yang sama persis di layar
          lebar (laptop/desktop). Sebelumnya isi header cuma dikasih
          padding dari tepi viewport, jadi nempel kiri sementara kartu di
          bawah ada di tengah -- kelihatan tidak nyambung. */}
      <div style={{ background: "#142850" }} className="px-6 py-6 text-white">
        <div className="mx-auto flex max-w-md items-start justify-between">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-slate-400">TALATEE AUTOMATION LAB</p>
            <h1
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              className="mt-1 text-3xl font-bold leading-tight"
            >
              {data.business_name}
            </h1>
            <p className="mt-1 text-xs text-slate-300">{getGreeting()} — dicatat otomatis, dibuka kapan saja.</p>
          </div>
          <div
            style={{ borderColor: "#2d9d6f" }}
            title="Diperbarui otomatis setiap 1 menit"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2"
          >
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
              <span
                className={`h-1.5 w-1.5 rounded-full bg-emerald-400 ${refreshing ? "animate-ping" : ""}`}
              />
              LIVE
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 pt-5">
        {/* Hari ini */}
        <SectionLabel>{`HARI INI — ${formatTanggalID(data.today.date)}`}</SectionLabel>
        <Card accent>
          <Row label="Jumlah transaksi" value={String(data.today.orders)} />
          <Row label="Rata-rata belanja (AOV)" value={formatRupiah(data.today.aov)} />
          <div className="my-2 border-t border-dashed border-[#d8d2bd]" />
          <Row
            label="Total Pendapatan"
            value={formatRupiah(data.today.revenue)}
            big
            color="#1f7a4f"
          />
          {data.today.orders === 0 && (
            <p className="mt-3 text-xs italic text-neutral-400">
              Belum ada transaksi tercatat hari ini — cek lagi nanti.
            </p>
          )}
        </Card>

        {/* Tren 14 hari */}
        <SectionLabel>TREN 14 HARI TERAKHIR</SectionLabel>
        <Card>
          {hasTrendData ? (
            <div className="flex h-32 items-stretch gap-1.5">
              {data.trend_14d.map((t) => (
                <div key={t.date} className="flex flex-1 flex-col justify-end gap-1">
                  {/* Kontainer bar butuh tinggi PASTI (h-28, bukan persentase) --
                      tinggi persentase di anak (di bawah) tidak akan terhitung
                      sama sekali kalau parent-nya tidak punya tinggi pasti
                      (ini akar penyebab bar sebelumnya collapse jadi 0px). */}
                  <div className="flex h-28 w-full items-end">
                    <div
                      title={`${t.date}: ${formatRupiah(t.revenue)} (${t.orders} transaksi)`}
                      style={{
                        height: `${Math.max((t.revenue / maxRevenue) * 100, 3)}%`,
                        background: "#1f7a4f",
                      }}
                      className="w-full rounded-t-sm"
                    />
                  </div>
                  <span className="text-center text-[9px] text-neutral-400">{t.date.slice(-2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-neutral-400">
              Belum ada transaksi tercatat dalam 14 hari terakhir.
            </p>
          )}
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
                style={{ borderBottom: i < data.top_products_14d.length - 1 ? "1px solid #ddd0a3" : undefined }}
              >
                <span className="flex items-center gap-3 text-sm">
                  <span style={{ color: RANK_COLORS[i] ?? "#a66a10" }} className="font-bold">
                    {i + 1}.
                  </span>
                  {p.produk}
                </span>
                <span style={{ color: "#142850" }} className="text-sm font-bold">
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
          <p>{refreshing ? "Memperbarui..." : `Terakhir dimuat: ${loadedAt}`}</p>
          <p>Talatee Automation Lab — Bizintelli Engine</p>
        </div>
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => load()}
            style={{ background: "#142850" }}
            className="rounded-md px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#1c3a6b] active:scale-95"
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
    <div className="mb-2 mt-5 flex items-center gap-2 text-[11px] font-semibold tracking-[0.15em] text-[#142850]">
      <span>{children}</span>
      <span className="h-px flex-1 border-t border-dashed" style={{ borderColor: "#c9b98a" }} />
    </div>
  );
}

function Card({
  children,
  padded = true,
  accent = false,
}: {
  children: React.ReactNode;
  padded?: boolean;
  /** Aksen garis navy tebal di atas -- dipakai HANYA untuk kartu "Hari ini",
      sebagai penanda struktural "ini yang paling penting di halaman ini",
      bukan dekorasi acak. Kalau tiap kartu dikasih aksen, tidak ada yang
      terasa lebih penting dari yang lain. */
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: "#fffdf8",
        borderColor: "#c9b98a",
        borderTopColor: accent ? "#142850" : "#c9b98a",
        borderTopWidth: accent ? "3px" : "1px",
      }}
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
      <span className="text-xs font-medium text-[#6b6354]">{label}</span>
      <span
        style={color ? { color } : undefined}
        className={big ? "text-xl font-bold" : "text-sm font-semibold"}
      >
        {value}
      </span>
    </div>
  );
}
