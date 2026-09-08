"use client";

// Copy to: components/AdminHeader.tsx
//
// Header atas panel admin (redesign 7 Sept 2026). Dipakai di SEMUA
// halaman admin lewat AdminShell -- judul & subjudul menyesuaikan halaman
// yang sedang dibuka (bukan di-hardcode "Dashboard Admin" di mana-mana).
//
// Tombol hamburger cuma tampak di mobile (lg:hidden), panggil onMenuClick
// dari AdminShell untuk membuka drawer Sidebar. Jam & tanggal REAL, jalan
// tiap menit (bukan cuma sekali pas mount), dipaksa zona waktu Asia/Jakarta
// (WIB) lewat Intl -- konsisten dengan BUSINESS_TIMEZONE default di
// lib/talatee-core/date-utils.ts (env var itu di server, tidak bisa dibaca
// dari client, jadi di sini di-hardcode WIB dengan catatan di bawah).
// Badge notifikasi angkanya REAL (needs-review + duplikat + stok menipis).
// Menu avatar sekarang beneran dipakai untuk Keluar (POST /api/logout) --
// sebelumnya endpoint ini ada tapi tidak pernah dipanggil dari UI mana pun.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard Admin", subtitle: "Pantau dan kelola sistem Buku Kas Warung" },
  "/transactions": { title: "Transaksi", subtitle: "Semua transaksi tersimpan, urut dari yang terbaru" },
  "/products": { title: "Produk & Stok", subtitle: "Kelola daftar produk dan penyesuaian stok" },
  "/upload": { title: "Upload Data", subtitle: "Tambah data transaksi dari file CSV atau Excel" },
  "/trash": { title: "Sampah", subtitle: "Pulihkan atau hapus permanen data yang sudah dibuang" },
};

function pageMeta(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const match = Object.keys(PAGE_TITLES).find((p) => p !== "/" && pathname.startsWith(p));
  return match ? PAGE_TITLES[match] : { title: "Buku Kas Warung", subtitle: "Panel admin" };
}

export function AdminHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const meta = pageMeta(pathname);

  const [alertCount, setAlertCount] = useState<number | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/needs-review").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/duplicates").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/dashboard-summary").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([needsReview, duplicates, summary]) => {
        const lowStock = summary?.low_stock_count ?? 0;
        setAlertCount((needsReview?.length ?? 0) + (duplicates?.length ?? 0) + lowStock);
      })
      .catch(() => setAlertCount(null));
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const dateLabel = now
    ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(now)
    : "";
  const timeLabel = now
    ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(now)
    : "";

  return (
    <header
      style={{ borderColor: "var(--color-dash-border)", background: "var(--color-dash-surface)" }}
      className="font-dash flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6"
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Buka menu"
          style={{ borderColor: "var(--color-dash-border)", color: "var(--color-dash-text)" }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-base lg:hidden"
        >
          ☰
        </button>
        <div className="min-w-0">
          <h1 style={{ color: "var(--color-dash-text)" }} className="truncate text-lg font-bold sm:text-xl">
            {meta.title}
          </h1>
          <p style={{ color: "var(--color-dash-muted)" }} className="hidden truncate text-sm sm:block">
            {meta.subtitle}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Tanggal + jam -- real, WIB, jalan tiap 30 detik */}
        <div
          style={{ borderColor: "var(--color-dash-border)", color: "var(--color-dash-text)" }}
          className="hidden shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium md:flex"
        >
          <span aria-hidden="true">📅</span>
          <span className="flex flex-col leading-tight">
            <span>{dateLabel || "..."}</span>
            <span style={{ color: "var(--color-dash-muted)" }} className="text-[10px]">
              {timeLabel ? `${timeLabel} WIB` : ""}
            </span>
          </span>
        </div>

        {/* Notifikasi -- angka REAL, klik = ke Overview (tempat semua
            item bisa diselesaikan lewat NeedsReviewList/DuplicateFlagList) */}
        <Link
          href="/"
          title={alertCount !== null ? `${alertCount} hal butuh perhatian` : "Memuat..."}
          style={{ borderColor: "var(--color-dash-border)", color: "var(--color-dash-text)" }}
          className="relative flex h-9 w-9 items-center justify-center rounded-md border"
        >
          🔔
          {alertCount !== null && alertCount > 0 && (
            <span
              style={{ background: "var(--color-dash-red)" }}
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
            >
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          )}
        </Link>

        {/* Avatar + menu -- 1 admin (belum ada multi-user), isinya cuma
            Keluar untuk sekarang */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-black/5"
          >
            <span
              style={{ background: "var(--color-dash-accent)" }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
            >
              A
            </span>
            <span className="hidden flex-col items-start leading-tight sm:flex">
              <span style={{ color: "var(--color-dash-text)" }} className="text-sm font-medium">
                Admin
              </span>
              <span style={{ color: "var(--color-dash-muted)" }} className="text-[10px]">
                Talatee
              </span>
            </span>
            <span style={{ color: "var(--color-dash-muted)" }} className="text-[10px]">
              ▾
            </span>
          </button>

          {menuOpen && (
            <div
              style={{ borderColor: "var(--color-dash-border)", background: "var(--color-dash-surface)" }}
              className="absolute right-0 top-full z-20 mt-2 w-40 overflow-hidden rounded-md border shadow-lg"
            >
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                style={{ color: "var(--color-dash-red)" }}
                className="block w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-black/5 disabled:opacity-50"
              >
                {loggingOut ? "Keluar..." : "Keluar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
