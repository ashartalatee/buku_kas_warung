"use client";

// Copy to: components/SettingsPage.tsx
//
// v3 (12 Sept 2026): "Profil Warung" dan "Notifikasi & Laporan" sekarang
// beneran fungsional (bukan lagi SEGERA) -- lihat catatan di
// app/api/settings/notifications/route.ts soal cakupan yang sengaja
// dibatasi (cuma ambang stok default, BUKAN jadwal laporan WA/Telegram).
// Sisanya (Transaksi, Automation, Integrasi, Data & Backup) masih SEGERA.

import { useEffect, useState } from "react";
import type { JSX } from "react";

type CardStatus = "ready" | "soon";

interface SettingsCard {
  key: string;
  title: string;
  description: string;
  icon: JSX.Element;
  status: CardStatus;
}

// Monokrom, bukan warna-warni per kategori: aktif -> aksen emas brand,
// belum ada -> abu-abu netral. Konsisten dengan pola yang sama di
// Sidebar (item aktif = emas, item SEGERA = abu-abu), bukan "kit ikon
// warna-warni" ala template SaaS generik.
function CardIcon({ path, active }: { path: JSX.Element; active: boolean }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
      style={{
        background: active ? "var(--color-dash-accent-soft)" : "var(--color-dash-surface-2)",
        color: active ? "var(--color-dash-accent)" : "var(--color-dash-muted)",
      }}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {path}
      </svg>
    </span>
  );
}

const CARDS: SettingsCard[] = [
  {
    key: "profile",
    title: "Profil Warung",
    description: "Kelola informasi warung Anda seperti nama, alamat, dan kontak.",
    icon: <><path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></>,
    status: "ready",
  },
  {
    key: "transactions",
    title: "Transaksi",
    description: "Atur metode pembayaran, format nomor transaksi, dan aturan transaksi.",
    icon: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></>,
    status: "soon",
  },
  {
    key: "notifications",
    title: "Notifikasi & Laporan",
    description: "Atur ambang stok menipis default untuk produk baru.",
    icon: <><path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" /><path d="M10 18a2 2 0 0 0 4 0" /></>,
    status: "ready",
  },
  {
    key: "automation",
    title: "Automation",
    description: "Atur pekerjaan otomatis seperti laporan, peringatan stok, dan deteksi duplikat.",
    icon: <path d="M13 3 4.5 14h6l-1 7L18 10h-6Z" />,
    status: "soon",
  },
  {
    key: "integrations",
    title: "Integrasi",
    description: "Hubungkan dengan layanan luar seperti Google Sheets, Telegram, atau WhatsApp.",
    icon: <><circle cx="8" cy="12" r="3" /><circle cx="16" cy="12" r="3" /><path d="M11 12h2" /></>,
    status: "soon",
  },
  {
    key: "backup",
    title: "Data & Backup",
    description: "Backup database kapan saja & lihat riwayat backup.",
    icon: <><ellipse cx="12" cy="6" rx="7" ry="2.5" /><path d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" /><path d="M5 12v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" /></>,
    status: "ready",
  },
  {
    key: "security",
    title: "Akun & Keamanan",
    description: "Kelola password dan keamanan akun Anda.",
    icon: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    status: "ready",
  },
];

export function SettingsPage() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="font-dash mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-semibold text-dash-text">Settings</h1>
        <p className="text-xs text-dash-muted">Atur sistem warung Anda.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {CARDS.map((card) => {
          const isOpen = openKey === card.key;
          return (
            <button
              key={card.key}
              onClick={() => card.status === "ready" && setOpenKey((k) => (k === card.key ? null : card.key))}
              disabled={card.status === "soon"}
              className={`dash-card flex flex-col justify-between gap-3 p-4 text-left transition ${
                card.status === "soon" ? "cursor-not-allowed" : "hover:border-dash-accent/40"
              } ${isOpen ? "border-dash-accent" : ""}`}
              style={isOpen ? { borderColor: "var(--color-dash-accent)" } : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <CardIcon path={card.icon} active={card.status === "ready"} />
                  <div>
                    <p className="text-sm font-semibold text-dash-text">{card.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-dash-muted">{card.description}</p>
                  </div>
                </div>
                {card.status === "ready" && (
                  <span className="shrink-0 text-xs text-dash-muted">{isOpen ? "︿" : "﹀"}</span>
                )}
              </div>

              <div
                className="rounded-md px-3 py-2 text-xs"
                style={{
                  background: "var(--color-dash-surface-2)",
                  color: card.status === "ready" ? "var(--color-dash-accent)" : "var(--color-dash-muted)",
                }}
              >
                {card.status === "soon" ? "Segera hadir -- belum tersedia." : "Klik untuk kelola."}
              </div>
            </button>
          );
        })}
      </div>

      {openKey === "profile" && <ProfileCard />}
      {openKey === "notifications" && <NotificationsCard />}
      {openKey === "backup" && <BackupCard />}
      {openKey === "security" && <ChangePasswordCard />}
    </div>
  );
}

function ProfileCard() {
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("warung");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/settings/profile")
      .then((r) => r.json())
      .then((data) => {
        setBusinessName(data.business_name ?? "");
        setBusinessType(data.business_type ?? "warung");
        setAddress(data.address ?? "");
        setPhone(data.phone ?? "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function submit() {
    setError(null);
    setSuccess(false);
    if (!businessName.trim()) {
      setError("Nama warung wajib diisi.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_name: businessName, business_type: businessType, address, phone }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal menyimpan profil.");
      return;
    }
    setSuccess(true);
  }

  if (loading) return <div className="dash-card p-4 text-sm text-dash-muted">Memuat...</div>;

  return (
    <div className="dash-card flex flex-col gap-3 p-4">
      <p className="text-sm font-semibold text-dash-text">Profil Warung</p>

      <Field label="Nama warung *">
        <input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1.5 text-sm text-dash-text outline-none focus:border-dash-accent"
        />
      </Field>
      <Field label="Jenis usaha">
        <select
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1.5 text-sm text-dash-text outline-none focus:border-dash-accent"
        >
          <option value="warung">Warung</option>
          <option value="laundry">Laundry</option>
          <option value="bengkel">Bengkel</option>
        </select>
      </Field>
      <Field label="Alamat (opsional)">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1.5 text-sm text-dash-text outline-none focus:border-dash-accent"
        />
      </Field>
      <Field label="No. kontak (opsional)">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1.5 text-sm text-dash-text outline-none focus:border-dash-accent"
        />
      </Field>

      {error && <p className="text-xs text-dash-red">{error}</p>}
      {success && <p className="text-xs text-dash-green">Profil berhasil disimpan.</p>}

      <button
        onClick={submit}
        disabled={saving}
        className="self-start rounded bg-dash-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : "Simpan Profil"}
      </button>
    </div>
  );
}

function NotificationsCard() {
  const [threshold, setThreshold] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then((data) => {
        setThreshold(data.default_low_stock_threshold != null ? String(data.default_low_stock_threshold) : "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function submit() {
    setError(null);
    setSuccess(false);
    setSaving(true);
    const res = await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ default_low_stock_threshold: threshold === "" ? null : Number(threshold) }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal menyimpan pengaturan.");
      return;
    }
    setSuccess(true);
  }

  if (loading) return <div className="dash-card p-4 text-sm text-dash-muted">Memuat...</div>;

  return (
    <div className="dash-card flex flex-col gap-3 p-4">
      <p className="text-sm font-semibold text-dash-text">Notifikasi & Laporan</p>

      <Field label="Ambang stok menipis default (opsional)">
        <input
          type="number"
          min="0"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          placeholder="misal: 5"
          className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1.5 text-sm text-dash-text outline-none focus:border-dash-accent"
        />
      </Field>
      <p className="text-[11px] text-dash-muted">
        Nilai ini otomatis mengisi kolom &quot;Ambang stok menipis&quot; setiap kali kamu tambah produk baru --
        tidak menimpa produk yang sudah ada.
      </p>

      <div
        className="rounded-lg px-3 py-2 text-xs text-dash-muted"
        style={{ background: "var(--color-dash-surface-2)" }}
      >
        Jadwal laporan otomatis (harian/mingguan via WhatsApp/Telegram) masih diatur manual lewat n8n
        (Setup_waha_n8n.md) -- belum bisa diatur dari sini.
      </div>

      {error && <p className="text-xs text-dash-red">{error}</p>}
      {success && <p className="text-xs text-dash-green">Pengaturan berhasil disimpan.</p>}

      <button
        onClick={submit}
        disabled={saving}
        className="self-start rounded bg-dash-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : "Simpan"}
      </button>
    </div>
  );
}

interface BackupItem {
  file: string;
  size_bytes: number;
  created_at: string;
}

function BackupCard() {
  const [backups, setBackups] = useState<BackupItem[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function load() {
    fetch("/api/settings/backup")
      .then((r) => r.json())
      .then((data) => setBackups(data.backups ?? []))
      .catch(() => setBackups([]));
  }

  useEffect(() => {
    load();
  }, []);

  async function runBackupNow() {
    setError(null);
    setSuccess(null);
    setRunning(true);
    const res = await fetch("/api/settings/backup", { method: "POST" });
    setRunning(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Backup gagal.");
      return;
    }
    const data = await res.json();
    setSuccess(`Backup berhasil: ${data.file} (${(data.size_bytes / 1024).toFixed(0)} KB)`);
    load();
  }

  return (
    <div className="dash-card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-dash-text">Data & Backup</p>
        <button
          onClick={runBackupNow}
          disabled={running}
          className="rounded bg-dash-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {running ? "Membackup..." : "Backup Sekarang"}
        </button>
      </div>

      <p className="text-xs text-dash-muted">
        Backup ini menyimpan seluruh isi database mentah (format .sql) untuk pemulihan darurat -- BUKAN file yang
        rapi buat dibaca manual. Ekspor CSV/Excel/PDF untuk dibaca manusia belum tersedia, akan menyusul terpisah.
      </p>

      {error && <p className="text-xs text-dash-red">{error}</p>}
      {success && <p className="text-xs text-dash-green">{success}</p>}

      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-medium text-dash-muted">Riwayat backup</p>
        {backups === null ? (
          <p className="text-xs text-dash-muted">Memuat...</p>
        ) : backups.length === 0 ? (
          <p className="text-xs text-dash-muted">Belum ada backup.</p>
        ) : (
          backups.map((b) => (
            <div
              key={b.file}
              className="flex items-center justify-between rounded-md px-3 py-2 text-xs"
              style={{ background: "var(--color-dash-surface-2)" }}
            >
              <span className="text-dash-text">{b.file}</span>
              <span className="text-dash-muted">
                {(b.size_bytes / 1024).toFixed(0)} KB ·{" "}
                {new Date(b.created_at).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    setSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Semua kolom wajib diisi.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/settings/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal mengganti password.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
  }

  return (
    <div className="dash-card flex flex-col gap-3 p-4">
      <p className="text-sm font-semibold text-dash-text">Ganti Password</p>
      <p className="text-xs text-dash-muted">
        Password ini dipakai untuk login ke dashboard admin. Pastikan hanya kamu yang tahu password baru setelah
        diganti.
      </p>

      <Field label="Password saat ini">
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1.5 text-sm text-dash-text outline-none focus:border-dash-accent"
        />
      </Field>
      <Field label="Password baru (minimal 6 karakter)">
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1.5 text-sm text-dash-text outline-none focus:border-dash-accent"
        />
      </Field>
      <Field label="Konfirmasi password baru">
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1.5 text-sm text-dash-text outline-none focus:border-dash-accent"
        />
      </Field>

      {error && <p className="text-xs text-dash-red">{error}</p>}
      {success && <p className="text-xs text-dash-green">Password berhasil diganti.</p>}

      <button
        onClick={submit}
        disabled={saving}
        className="self-start rounded bg-dash-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : "Simpan Password Baru"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-dash-muted">{label}</span>
      {children}
    </label>
  );
}