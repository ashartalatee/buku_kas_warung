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
    <div
      style={{
        maxWidth: "22rem",
        margin: "4rem auto",
        padding: "1.5rem",
        border: "1px solid #e5e7eb",
        borderRadius: "0.5rem",
      }}
    >
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>
        Buku Kas Warung
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.25rem" }}>
        Masukkan password untuk membuka dashboard.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.375rem",
            marginBottom: "0.75rem",
          }}
        />
        {error && (
          <p style={{ fontSize: "0.8rem", color: "#dc2626", marginBottom: "0.75rem" }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={loading || password.length === 0}
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            background: loading ? "#93c5fd" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "0.375rem",
            fontWeight: 500,
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Memeriksa..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
