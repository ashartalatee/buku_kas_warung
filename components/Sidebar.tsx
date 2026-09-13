"use client";

// Copy to: components/Sidebar.tsx
//
// Sidebar navigasi kiri (redesign 12 Sept 2026 -- selaras dengan identitas
// "buku kas": navy brand + aksen emas/perunggu, ikon garis SVG (bukan
// emoji), active-state pakai garis aksen kiri + tint lembut (bukan blok
// solid). Menu yang belum ada halamannya (Processing/Automation/Activity
// Log/Settings) sekarang punya badge "SEGERA" yang KELIHATAN, bukan cuma
// tooltip hover -- supaya jelas ini rencana, bukan link rusak. Struktur &
// logika lain sama persis (drawer mobile, auto-close per halaman).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

type IconKey =
  | "overview"
  | "upload"
  | "transactions"
  | "products"
  | "trash"
  | "processing"
  | "automation"
  | "activity"
  | "settings";

interface NavItem {
  label: string;
  icon: IconKey;
  href?: string;
  note?: string;
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

// 12 Sept 2026: dirampingkan drastis -- /ops SEKARANG murni buat
// monitoring (lihat OpsMonitor.tsx), bukan mengoperasikan bisnis
// (upload/kelola produk/kelola transaksi itu tugas client sendiri di
// Panel Sederhana). Cuma 2 menu: Overview (masalah + status sistem) dan
// Activity Log (riwayat lengkap buat diagnosis lebih dalam).
const NAV_GROUPS: NavGroup[] = [
  { label: null, items: [{ label: "Overview", href: "/ops", icon: "overview" }] },
  { label: null, items: [{ label: "Activity Log", href: "/ops/activity", icon: "activity" }] },
];

function NavIcon({ name }: { name: IconKey }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "overview":
      return (
        <svg {...common}>
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6 10v9h12v-9" />
          <path d="M10 19v-5h4v5" />
        </svg>
      );
    case "upload":
      return (
        <svg {...common}>
          <path d="M12 15.5V4.5" />
          <path d="M7.5 9 12 4.5 16.5 9" />
          <path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
        </svg>
      );
    case "transactions":
      return (
        <svg {...common}>
          <path d="M6.5 3.5h11v17l-2.3-1.4-2.2 1.4-2.3-1.4-2.2 1.4-2-1.4Z" />
          <path d="M9 8.5h6M9 12h6M9 15.5h3.5" />
        </svg>
      );
    case "products":
      return (
        <svg {...common}>
          <path d="M3.5 8 12 3.5 20.5 8 12 12.5 3.5 8Z" />
          <path d="M3.5 8v8l8.5 4.5 8.5-4.5V8" />
          <path d="M12 12.5V21" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M4.5 7h15" />
          <path d="M9.5 7V4.5h5V7" />
          <path d="M6.5 7 7.4 19a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9L17.5 7" />
          <path d="M10.3 11v6M13.7 11v6" />
        </svg>
      );
    case "processing":
      return (
        <svg {...common}>
          <path d="M14.8 6.2a4 4 0 1 0-5.5 5.5L4.5 16.5l3 3L12.3 14.7a4 4 0 0 0 5.5-5.5l-2.7 2.7-2-2Z" />
        </svg>
      );
    case "automation":
      return (
        <svg {...common}>
          <path d="M13 3 4.5 14h6l-1 7L18 10h-6Z" />
        </svg>
      );
    case "activity":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4.3l3 1.9" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.1 14.9a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a1.9 1.9 0 1 1-3.8 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a1.9 1.9 0 1 1 0-3.8h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a1.9 1.9 0 1 1 3.8 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a1.9 1.9 0 1 1 0 3.8h-.1a1.6 1.6 0 0 0-1.5 1Z" />
        </svg>
      );
  }
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [clientUrl, setClientUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard-link")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setClientUrl(data?.url ?? null))
      .catch(() => setClientUrl(null));
  }, []);

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
        <button
          onClick={onClose}
          aria-label="Tutup menu"
          style={{ color: "var(--color-dash-sidebar-muted)" }}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-white/5 lg:hidden"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 px-5 py-6">
          <span
            style={{ background: "var(--color-dash-sidebar-active-accent)" }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
          >
            <span className="text-sm font-bold text-[#142850]">T</span>
          </span>
          <div className="min-w-0">
            <p
              style={{ color: "var(--color-dash-sidebar-text)" }}
              className="text-[13px] font-semibold leading-tight tracking-[0.04em]"
            >
              TALATEE
            </p>
            <p style={{ color: "var(--color-dash-sidebar-muted)" }} className="text-[11px] leading-tight">
              Buku Kas Warung
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-4 px-3 pt-2">
          {NAV_GROUPS.map((group, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              {group.label && (
                <p
                  style={{ color: "var(--color-dash-sidebar-section)" }}
                  className="px-3 pb-1.5 pt-1 text-[10.5px] font-medium tracking-[0.08em]"
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
                      className="flex cursor-not-allowed items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2.5 text-[13.5px] font-medium"
                    >
                      <span className="opacity-60">
                        <NavIcon name={item.icon} />
                      </span>
                      <span className="flex-1 opacity-60">{item.label}</span>
                      <span
                        style={{
                          background: "var(--color-dash-sidebar-hover)",
                          color: "var(--color-dash-sidebar-section)",
                          borderColor: "var(--color-dash-sidebar-border)",
                        }}
                        className="shrink-0 rounded border px-1.5 py-0.5 text-[8.5px] font-semibold tracking-wider"
                      >
                        SEGERA
                      </span>
                    </div>
                  );
                }
                const active = item.href === "/ops" ? pathname === "/ops" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    style={{
                      background: active ? "var(--color-dash-sidebar-active-bg)" : "transparent",
                      borderColor: active ? "var(--color-dash-sidebar-active-accent)" : "transparent",
                      color: active ? "var(--color-dash-sidebar-text)" : "var(--color-dash-sidebar-muted)",
                    }}
                    className="flex items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-[13.5px] font-medium transition-colors hover:bg-white/5"
                  >
                    <span style={{ color: active ? "var(--color-dash-sidebar-active-accent)" : undefined }}>
                      <NavIcon name={item.icon} />
                    </span>
                    {item.label}
                    {item.note && !active && (
                      <span
                        style={{ background: "var(--color-dash-sidebar-hover)", color: "var(--color-dash-sidebar-muted)" }}
                        className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold"
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

        <div className="mt-4 flex flex-col gap-3 px-3 pb-5">
          {clientUrl && (
            <a
              href={clientUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ borderColor: "var(--color-dash-sidebar-border)", color: "var(--color-dash-sidebar-text)" }}
              className="flex items-center justify-between rounded-md border px-3 py-2.5 text-xs font-medium hover:bg-white/5"
            >
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--color-dash-green)" }} />
                Warung Kas Digital
              </span>
              <span style={{ color: "var(--color-dash-sidebar-muted)" }}>↗</span>
            </a>
          )}

          <div
            style={{ background: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.3)" }}
            className="rounded-md border px-3 py-3"
          >
            <p className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--color-dash-green)" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-dash-green)" }} />
              Sistem Online
            </p>
            <p style={{ color: "var(--color-dash-sidebar-muted)" }} className="mt-0.5 text-[11px]">
              Semua layanan berjalan normal
            </p>
          </div>

          <a
            href="/"
            style={{ color: "var(--color-dash-sidebar-muted)" }}
            className="px-1 text-[11px] hover:underline"
          >
            ← Panel Sederhana
          </a>

          <p style={{ color: "var(--color-dash-sidebar-section)" }} className="px-1 text-[10px]">
            v0.1.0
          </p>
        </div>
      </aside>
    </>
  );
}
