"use client";

// Copy to: components/SimplePanel.tsx
//
// Panel client (12 Sept 2026) -- SENGAJA cuma 1 layar, 1 tujuan: upload
// data + buka dashboard. TIDAK ada sidebar/menu segudang seperti Dashboard
// Admin (yang sekarang pindah ke /ops, dipakai Ashar sendiri buat kelola
// & diagnosis, bukan buat client). Kalau nanti ada kebutuhan client baru
// yang nyata, tambah di sini secukupnya -- jangan tergoda menambah menu
// "biar keliatan lengkap" tanpa kebutuhan nyata (lihat diskusi 12 Sept
// soal project ini sempat "terlalu over").

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCsvForm } from "./UploadCsvForm";

export function SimplePanel() {
  const router = useRouter();
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard-link")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setDashboardUrl(data?.url ?? null))
      .catch(() => setDashboardUrl(null));
  }, []);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="font-dash flex min-h-dvh flex-col" style={{ background: "var(--color-dash-bg)" }}>
      <header
        className="flex items-center justify-between border-b px-5 py-4"
        style={{ borderColor: "var(--color-dash-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-md"
            style={{ background: "var(--color-navy)" }}
          >
            <span className="text-xs font-bold" style={{ color: "var(--color-dash-accent)" }}>
              T
            </span>
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight text-dash-text">Buku Kas Warung</p>
            <p className="text-[11px] leading-tight text-dash-muted">Talatee</p>
          </div>
        </div>
        <button
          onClick={logout}
          disabled={loggingOut}
          className="text-xs font-medium text-dash-muted hover:text-dash-text"
        >
          {loggingOut ? "Keluar..." : "Keluar"}
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-5">
        <UploadCsvForm />

        {dashboardUrl && (
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="dash-card flex items-center justify-between p-4 text-sm font-medium text-dash-text hover:bg-dash-surface-2"
          >
            Lihat Dashboard
            <span style={{ color: "var(--color-dash-accent)" }}>→</span>
          </a>
        )}

        <div className="dash-card flex items-center gap-3 p-4">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "var(--color-dash-surface-2)", color: "var(--color-dash-muted)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="12" r="3" />
              <circle cx="16" cy="12" r="3" />
              <path d="M11 12h2" />
            </svg>
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-dash-text">Hubungkan API Kasir/POS</p>
            <p className="text-xs text-dash-muted">Segera hadir.</p>
          </div>
          <span
            style={{
              background: "var(--color-dash-surface-2)",
              color: "var(--color-dash-muted)",
              borderColor: "var(--color-dash-border)",
            }}
            className="shrink-0 rounded border px-1.5 py-0.5 text-[8.5px] font-semibold tracking-wider"
          >
            SEGERA
          </span>
        </div>
      </main>

    </div>
  );
}
