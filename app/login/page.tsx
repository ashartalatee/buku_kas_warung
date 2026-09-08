"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal login.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="ledger-card w-full max-w-xs p-6">
        <h1 className="text-lg font-semibold text-ink">Buku Kas Warung</h1>
        <p className="mt-1 mb-5 text-sm text-muted">Masukkan password untuk membuka panel admin.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="rounded border border-rule bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-navy"
          />
          {error && <p className="text-xs text-ledger-red">{error}</p>}
          <button
            type="submit"
            disabled={loading || password.length === 0}
            className="rounded bg-navy px-3 py-2 text-sm font-medium text-paper transition hover:bg-navy-light disabled:opacity-50"
          >
            {loading ? "Memeriksa..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
