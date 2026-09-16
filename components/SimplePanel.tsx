"use client";

// Copy to: components/SimplePanel.tsx
//
// v2 (12 Sept 2026): disatukan dengan identitas "buku besar" yang sama
// persis dengan /dashboard (navy header + eyebrow label, krem, font mono
// bawaan body) -- sebelumnya panel ini pakai tema "dash" generik (abu
// terang, font Inter), jadi terasa seperti aplikasi berbeda padahal ini
// 1 alur yang sama buat client (WA -> Dashboard -> Upload -> balik lagi).
//
// 15 Sept 2026: tambah DataInboxList (riwayat file diupload + hapus per
// batch) dan link ke /trash (Sampah) -- komponennya sudah lama ada tapi
// belum pernah dipasang di halaman ini.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCsvForm } from "./UploadCsvForm";
import { TransactionCalendar } from "./TransactionCalendar";
import { NeedsReviewList } from "./NeedsReviewList";
import { DuplicateFlagList } from "./DuplicateFlagList";
import { DataInboxList } from "./DataInboxList";
import { ActivityLogList } from "./ActivityLogList";

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
    <div className="flex min-h-dvh flex-col bg-cream">
      <header style={{ background: "#142850" }} className="px-5 py-6 text-paper">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60">
              Talatee Automation Lab
            </p>
            <h1 className="mt-0.5 text-xl font-bold">Buku Kas Warung</h1>
          </div>
          <div className="flex items-center gap-2">
            
            <a
              href="/trash"
              className="rounded border border-white/25 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/10 active:scale-95"
            >
              🗑️ Sampah
            </a>
            <button
              onClick={logout}
              disabled={loggingOut}
              className="rounded border border-white/25 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/10 active:scale-95"
            >
              {loggingOut ? "Keluar..." : "Keluar"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-5">
        <UploadCsvForm />

        <DataInboxList />

        <NeedsReviewList />
        <DuplicateFlagList />

        <TransactionCalendar />

        <div className="dash-card p-4">
          <ActivityLogList />
        </div>

        {dashboardUrl && (
          
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ledger-card flex items-center justify-between p-4 text-sm font-medium text-ink transition hover:bg-[#f1ecd9] active:scale-[0.99]"
          >
            Lihat Dashboard
            <span style={{ color: "#b8863d" }}>→</span>
          </a>
        )}

        <div className="ledger-card flex items-center gap-3 p-4">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
            style={{ background: "#eee2bd", color: "#8a6a2f" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="12" r="3" />
              <circle cx="16" cy="12" r="3" />
              <path d="M11 12h2" />
            </svg>
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">Hubungkan API Kasir/POS</p>
            <p className="text-xs text-muted">Segera hadir.</p>
          </div>
          <span
            style={{ background: "#eee2bd", color: "#8a6a2f", borderColor: "#ddd0a3" }}
            className="shrink-0 rounded border px-1.5 py-0.5 text-[8.5px] font-semibold tracking-wider"
          >
            SEGERA
          </span>
        </div>
      </main>

      <footer className="pb-6 pt-2 text-center">
        <p className="text-[9.5px] tracking-widest text-muted">TALATEE AUTOMATION LAB</p>
      </footer>
    </div>
  );
}
