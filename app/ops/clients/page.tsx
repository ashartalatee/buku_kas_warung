"use client";

import { useEffect, useState } from "react";

interface ClientRow {
  business_id: string;
  business_name: string;
  business_type: string;
  created_at: string;
}

interface NewClientResult {
  business_id: string;
  business_name: string;
  password: string;
  login_url: string;
}

export default function ClientsAdminPage() {
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("warung");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<NewClientResult | null>(null);

  async function load() {
    const res = await fetch("/api/ops/clients");
    setClients(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    setJustCreated(null);
    const res = await fetch("/api/ops/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_name: name, business_type: type }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal membuat client.");
      return;
    }
    setJustCreated(data);
    setName("");
    load();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <div>
        <h1 className="text-xl font-bold text-ink">Kelola Client</h1>
        <p className="text-sm text-muted">Tambah client baru, atau lihat daftar client yang sudah ada.</p>
      </div>

      <form onSubmit={submit} className="ledger-card flex flex-col gap-3 p-4">
        <p className="text-sm font-semibold text-ink">Tambah Client Baru</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama brand, mis. Warung Ibu Sari"
          className="rounded border border-rule bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-navy"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded border border-rule bg-paper px-3 py-2 text-sm text-ink"
        >
          <option value="warung">Warung</option>
          <option value="laundry">Laundry</option>
          <option value="bengkel">Bengkel</option>
        </select>
        {error && <p className="text-xs text-ledger-red">{error}</p>}
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="self-start rounded bg-navy px-4 py-2 text-sm font-medium text-paper hover:bg-navy-light disabled:opacity-50"
        >
          {creating ? "Membuat..." : "Buat Client"}
        </button>
      </form>

      {justCreated && (
        <div className="ledger-card border-2 p-4" style={{ borderColor: "#1f6d47" }}>
          <p className="text-sm font-semibold" style={{ color: "#1f6d47" }}>
            ✅ Client &quot;{justCreated.business_name}&quot; berhasil dibuat
          </p>
          <p className="mt-2 text-xs text-muted">
            Catat password ini SEKARANG -- tidak akan ditampilkan lagi setelah kamu tinggalkan halaman ini.
          </p>
          <div className="mt-2 flex flex-col gap-1 rounded bg-cream p-3 text-xs">
            <p>
              <strong>Login URL:</strong>{" "}
              <code className="break-all">{typeof window !== "undefined" ? window.location.origin : ""}{justCreated.login_url}</code>
            </p>
            <p>
              <strong>Password:</strong> <code>{justCreated.password}</code>
            </p>
          </div>
        </div>
      )}

      <div className="ledger-card p-4">
        <p className="mb-3 text-sm font-semibold text-ink">Daftar Client ({clients?.length ?? "..."})</p>
        {clients === null ? (
          <p className="text-sm text-muted">Memuat...</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-muted">Belum ada client.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {clients.map((c) => (
              <div key={c.business_id} className="border-b border-rule pb-2 last:border-0">
                <p className="text-sm text-ink">{c.business_name} <span className="text-muted">({c.business_type})</span></p>
                <p className="text-xs text-muted break-all">
                  /login?biz={c.business_id}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
