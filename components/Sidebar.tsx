"use client";

// Copy to: components/Sidebar.tsx
//
// Sidebar navigasi kiri (redesign 7 Sept 2026, mockup navy + konten
// terang). Dua mode tampilan diatur lewat 1 breakpoint (lg = 1024px):
//   - Desktop (>=1024px): selalu tampil, ikut tinggi layar, TIDAK ikut
//     discroll bareng konten (lihat AdminShell.tsx untuk mekanisme kunci
//     tingginya).
//   - Mobile (<1024px): drawer -- posisi fixed, di luar layar
//     (-translate-x-full) sampai `open` true, lalu geser masuk. Ada
//     backdrop gelap yang menutup drawer kalau ditekan, dan drawer auto-
//     tertutup tiap pindah halaman (tanpa ini, habis tap menu di HP,
//     drawer akan tetap menutupi halaman baru sampai di-tap manual lagi).
//
// Menu dibagi 4 kelompok mengikuti mockup (tanpa label / DATA / SYSTEM /
// PENGATURAN). Yang linknya beneran ada (Overview/Upload Data/Transaksi/
// Produk) pakai <Link>. Yang FITURNYA BELUM ADA sama sekali sebagai
// halaman tersendiri (Processing/Automation/Activity Log/Settings)
// sengaja dibuat non-klik dengan badge "Segera Hadir" -- supaya jelas ini
// rencana, bukan link mati/rusak kalau diklik. "Validasi" beda kasus: FITUR-
// nya sudah beneran ada & jalan (NeedsReviewList + DuplicateFlagList di
// halaman Overview), cuma belum jadi halaman terpisah -- jadi diarahkan ke
// "/" (bukan disamakan dengan Processing/dkk yang benar-benar belum ada).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  icon: string;
  href?: string; // tidak ada href = belum ada fiturnya sama sekali
  note?: string; // dipakai utk "Validasi" -- bukan "segera hadir", tapi "ada di Overview"
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { label: null, items: [{ label: "Overview", href: "/", icon: "🏠" }] },
  {
    label: "DATA",
    items: [
      { label: "Upload Data", href: "/upload", icon: "📥" },
      { label: "Transaksi", href: "/transactions", icon: "🧾" },
      { label: "Produk", href: "/products", icon: "📦" },
      { label: "Sampah", href: "/trash", icon: "🗑️" },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { label: "Processing", icon: "🛠️" },
      { label: "Automation", icon: "⚡" },
      { label: "Activity Log", icon: "🕒" },
    ],
  },
  { label: "PENGATURAN", items: [{ label: "Settings", icon: "⚙️" }] },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [clientUrl, setClientUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard-link")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setClientUrl(data?.url ?? null))
      .catch(() => setClientUrl(null));
  }, []);

  // Tutup drawer otomatis tiap pindah halaman (cuma relevan di mobile --
  // di desktop `open` tidak dipakai untuk apa pun karena sidebar sudah
  // selalu translate-x-0 lewat class lg:translate-x-0).
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[1px] lg:hidden"
        />
      )}

      <aside
        style={{ background: "var(--color-dash-sidebar-bg)", borderColor: "var(--color-dash-sidebar-border)" }}
        className={`font-dash fixed inset-y-0 left-0 z-40 flex h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Tombol tutup -- cuma tampak di mobile (di desktop drawer selalu
            terbuka, tidak butuh tombol tutup). */}
        <button
          onClick={onClose}
          aria-label="Tutup menu"
          style={{ color: "var(--color-dash-sidebar-muted)" }}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-white/5 lg:hidden"
        >
          ✕
        </button>

        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5">
          <span
            style={{ background: "linear-gradient(135deg, var(--color-dash-accent), #7c8cff)" }}
            className="flex h-9 w-9 shrink-0 rotate-45 items-center justify-center rounded-lg"
          >
            <span className="-rotate-45 text-sm font-extrabold text-white">T</span>
          </span>
          <div className="min-w-0">
            <p style={{ color: "var(--color-dash-sidebar-text)" }} className="text-sm font-bold leading-tight tracking-wide">
              TALATEE
            </p>
            <p style={{ color: "var(--color-dash-sidebar-muted)" }} className="text-[11px] leading-tight">
              Buku Kas Warung
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-3 px-3">
          {NAV_GROUPS.map((group, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              {group.label && (
                <p
                  style={{ color: "var(--color-dash-sidebar-section)" }}
                  className="px-3 pb-1 pt-2 text-[10px] font-semibold tracking-wider"
                >
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                if (!item.href) {
                  return (
                    <div
                      key={item.label}
                      title="Segera hadir -- belum ada halaman tersendiri untuk ini"
                      style={{ color: "var(--color-dash-sidebar-muted)" }}
                      className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium opacity-50"
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-base">{item.icon}</span>
                        {item.label}
                      </span>
                    </div>
                  );
                }
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    style={
                      active
                        ? { background: "var(--color-dash-sidebar-active-bg)", color: "#ffffff" }
                        : { color: "var(--color-dash-sidebar-muted)" }
                    }
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-white/5"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-base">{item.icon}</span>
                      {item.label}
                    </span>
                    {item.note && !active && (
                      <span
                        style={{ background: "var(--color-dash-sidebar-hover)", color: "var(--color-dash-sidebar-muted)" }}
                        className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold"
                      >
                        {item.note.toUpperCase()}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-4 flex flex-col gap-3 px-3 pb-4">
          {clientUrl && (
            <a
              href={clientUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ borderColor: "var(--color-dash-sidebar-border)", color: "var(--color-dash-sidebar-text)" }}
              className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-xs font-medium hover:bg-white/5"
            >
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--color-dash-green)" }} />
                Warung Kas Digital
              </span>
              <span style={{ color: "var(--color-dash-sidebar-muted)" }}>↗</span>
            </a>
          )}

          {/* "Sistem Online" statis (bukan hasil fetch) -- kalau halaman ini
              berhasil dirender, berarti server Next.js-nya memang jalan. */}
          <div
            style={{ background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.35)" }}
            className="rounded-lg border px-3 py-3"
          >
            <p className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--color-dash-green)" }}>
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--color-dash-green)" }} />
              Sistem Online
            </p>
            <p style={{ color: "var(--color-dash-sidebar-muted)" }} className="mt-0.5 text-[11px]">
              Semua layanan berjalan normal
            </p>
          </div>

          <div style={{ borderColor: "var(--color-dash-sidebar-border)" }} className="rounded-lg border px-3 py-3">
            <p style={{ color: "var(--color-dash-sidebar-text)" }} className="text-xs font-semibold">
              Talatee
            </p>
            <p style={{ color: "var(--color-dash-sidebar-muted)" }} className="mt-0.5 text-[11px]">
              Otomatisasi data, untuk keputusan yang lebih baik.
            </p>
          </div>

          <p style={{ color: "var(--color-dash-sidebar-section)" }} className="px-1 text-[10px]">
            v0.1.0
          </p>
        </div>
      </aside>
    </>
  );
}
