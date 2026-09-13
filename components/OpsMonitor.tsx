"use client";

// Copy to: components/OpsMonitor.tsx
//
// Panel monitoring Ashar (12 Sept 2026) -- versi SANGAT sederhana,
// sengaja BUKAN dashboard operasional. Cuma 1 tujuan: kelihatan cepat
// "ada masalah di client ini atau tidak". Tidak ada kelola produk,
// kelola transaksi, upload manual -- itu semua tugas client sendiri
// (Panel Sederhana), bukan tugas Ashar. Kalau nanti Ashar benar-benar
// butuh lihat detail transaksi 1 client buat investigasi masalah, itu
// keputusan yang dibuat SAAT kebutuhannya nyata, bukan disiapkan di
// awal "jaga-jaga".

import { useEffect, useState } from "react";
import { NeedsReviewList } from "./NeedsReviewList";
import { DuplicateFlagList } from "./DuplicateFlagList";

interface BackupItem {
  file: string;
  created_at: string;
}

export function OpsMonitor() {
  const [backups, setBackups] = useState<BackupItem[] | null>(null);
  const [systemError, setSystemError] = useState(false);

  useEffect(() => {
    fetch("/api/settings/backup")
      .then((r) => {
        if (!r.ok) throw new Error("gagal");
        return r.json();
      })
      .then((data) => setBackups(data.backups ?? []))
      .catch(() => {
        setBackups([]);
        setSystemError(true);
      });
  }, []);

  const lastBackup = backups && backups.length > 0 ? backups[0] : null;

  return (
    <div className="font-dash mx-auto flex max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-semibold text-dash-text">Panel Monitoring</h1>
        <p className="text-xs text-dash-muted">Pantau masalah &amp; status sistem client.</p>
      </div>

      {/* Status sistem -- ringkas, cuma yang penting buat tahu "aman atau
          tidak", bukan detail teknis. */}
      <div
        className="dash-card flex items-center justify-between p-4"
        style={{
          borderLeft: `3px solid ${systemError ? "var(--color-dash-red)" : "var(--color-dash-green)"}`,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: systemError ? "var(--color-dash-red)" : "var(--color-dash-green)" }}
          />
          <span className="text-sm font-medium text-dash-text">
            {systemError ? "Sistem bermasalah" : "Sistem Online"}
          </span>
        </div>
        <span className="text-xs text-dash-muted">
          {backups === null
            ? "Memuat..."
            : lastBackup
              ? `Backup terakhir: ${new Date(lastBackup.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "Belum ada backup"}
        </span>
      </div>

      {/* Inti panel -- masalah yang butuh perhatian. Komponen ini sudah
          ada & jalan (dipakai juga sebelumnya di Overview lama), cuma
          dipindah ke sini karena ini memang fungsinya monitoring. */}
      <NeedsReviewList />
      <DuplicateFlagList />

      <a
        href="/ops/activity"
        className="dash-card flex items-center justify-between p-4 text-sm font-medium text-dash-text hover:bg-dash-surface-2"
      >
        Lihat riwayat aktivitas lengkap (koreksi, stok, upload, duplikat)
        <span style={{ color: "var(--color-dash-accent)" }}>→</span>
      </a>
    </div>
  );
}
