"use client";

// Copy to: components/ProductsList.tsx
//
// Kelola Produk & Stok -- CRUD produk + penyesuaian stok manual (delta +
// alasan wajib, lewat POST /adjust-stock). Stok TIDAK bisa diedit langsung
// di sini (field stock_qty sengaja read-only di form edit) -- satu-satunya
// jalur mengubah stok adalah tombol "Sesuaikan stok", supaya setiap
// perubahan tetap punya alasan tercatat di stock_adjustments (lihat
// products.ts). Pola UI mengikuti NeedsReviewList.tsx yang sudah ada:
// plain fetch, state lokal, tanpa library form eksternal.

import { useEffect, useState } from "react";

interface Product {
  product_id: string;
  name: string;
  category: string | null;
  unit: string;
  price: number | null;
  stock_qty: number;
  low_stock_threshold: number | null;
  is_active: boolean;
}

interface StockHistoryItem {
  adjustment_id: string;
  delta: number;
  stock_after: number;
  reason: string;
  reason_detail: string | null;
  performed_by: string;
  performed_at: string;
}

const STOCK_REASONS = ["Stok masuk", "Terjual manual", "Rusak/hilang", "Koreksi hitung ulang", "Lainnya"];

function formatRupiah(n: number | null): string {
  if (n === null) return "-";
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

export function ProductsList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/products${showArchived ? "?all=1" : ""}`);
    setProducts(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  const lowStockCount = products.filter(
    (p) => p.is_active && p.low_stock_threshold !== null && p.stock_qty <= p.low_stock_threshold
  ).length;

  return (
    <div className="font-dash mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-dash-text">Kelola Produk & Stok</h1>
        <button
          onClick={() => setShowAddForm((s) => !s)}
          className="rounded bg-dash-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          {showAddForm ? "Batal" : "+ Produk baru"}
        </button>
      </div>

      {lowStockCount > 0 && (
        <div
          className="dash-card dash-card--action p-3 text-sm text-dash-amber"
          style={{ "--accent": "var(--color-dash-amber)" } as React.CSSProperties}
        >
          ⚠️ {lowStockCount} produk stoknya sudah di ambang batas menipis.
        </div>
      )}

      {showAddForm && (
        <AddProductForm
          onCreated={() => {
            setShowAddForm(false);
            load();
          }}
        />
      )}

      {error && <p className="text-sm text-dash-red">{error}</p>}

      <label className="flex items-center gap-2 text-xs text-dash-muted">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Tampilkan produk yang diarsipkan
      </label>

      {loading ? (
        <p className="text-sm text-dash-muted">Memuat...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-dash-muted">Belum ada produk. Tambah produk pertama di atas.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((p) => (
            <ProductRow key={p.product_id} product={p} onChanged={load} onError={setError} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddProductForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [price, setPrice] = useState("");
  const [initialStock, setInitialStock] = useState("0");
  const [lowStockThreshold, setLowStockThreshold] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Nama produk wajib diisi.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category: category || undefined,
        unit,
        price: price || undefined,
        initial_stock: initialStock || undefined,
        low_stock_threshold: lowStockThreshold || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal membuat produk.");
      return;
    }
    onCreated();
  }

  return (
    <div className="flex flex-col gap-2 dash-card p-4">
      <Field label="Nama produk *">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1 text-sm text-dash-text outline-none focus:border-dash-accent"
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Kategori">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1 text-sm text-dash-text outline-none focus:border-dash-accent"
          />
        </Field>
        <Field label="Satuan">
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1 text-sm text-dash-text outline-none focus:border-dash-accent"
          />
        </Field>
        <Field label="Harga jual (Rp)">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1 text-sm text-dash-text outline-none focus:border-dash-accent"
          />
        </Field>
        <Field label="Stok awal">
          <input
            type="number"
            value={initialStock}
            onChange={(e) => setInitialStock(e.target.value)}
            className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1 text-sm text-dash-text outline-none focus:border-dash-accent"
          />
        </Field>
      </div>
      <Field label="Ambang stok menipis (opsional -- kosongkan kalau tidak perlu peringatan)">
        <input
          type="number"
          value={lowStockThreshold}
          onChange={(e) => setLowStockThreshold(e.target.value)}
          className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1 text-sm text-dash-text outline-none focus:border-dash-accent"
        />
      </Field>
      {error && <p className="text-xs text-dash-red">{error}</p>}
      <button
        onClick={submit}
        disabled={saving}
        className="mt-1 rounded bg-dash-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : "Simpan produk"}
      </button>
    </div>
  );
}

function ProductRow({
  product,
  onChanged,
  onError,
}: {
  product: Product;
  onChanged: () => void;
  onError: (msg: string | null) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "adjust" | "history">("view");
  const isLowStock =
    product.is_active && product.low_stock_threshold !== null && product.stock_qty <= product.low_stock_threshold;

  return (
    <div
      className={`rounded border p-3 ${
        !product.is_active
          ? "border-dash-border bg-dash-surface-2 opacity-60"
          : isLowStock
            ? "border-dash-border bg-dash-surface border-l-[3px]"
            : "border-dash-border bg-dash-surface"
      }`}
      style={isLowStock && product.is_active ? { borderLeftColor: "var(--color-dash-amber)" } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium break-words">
            {product.name} {!product.is_active && <span className="text-xs text-dash-muted">(diarsipkan)</span>}
          </p>
          <p className="text-xs text-dash-muted">
            {product.category ? `${product.category} · ` : ""}
            {formatRupiah(product.price)} / {product.unit}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-sm font-semibold ${isLowStock ? "text-dash-amber" : "text-dash-text"}`}>
            {product.stock_qty} {product.unit}
          </p>
          {isLowStock && <p className="text-[10px] text-dash-amber">Stok menipis</p>}
        </div>
      </div>

      {mode === "view" && (
        <div className="mt-2 flex flex-wrap gap-2 border-t border-dash-border pt-2">
          {product.is_active ? (
            <>
              <SmallButton onClick={() => setMode("adjust")}>Sesuaikan stok</SmallButton>
              <SmallButton onClick={() => setMode("edit")}>Edit</SmallButton>
              <SmallButton onClick={() => setMode("history")}>Riwayat</SmallButton>
              <SmallButton
                variant="danger"
                onClick={async () => {
                  if (!confirm(`Arsipkan "${product.name}"? Bisa diaktifkan lagi lewat "Tampilkan produk diarsipkan".`))
                    return;
                  const res = await fetch(`/api/products/${product.product_id}`, { method: "DELETE" });
                  if (!res.ok) {
                    const data = await res.json();
                    onError(data.error ?? "Gagal mengarsipkan produk.");
                    return;
                  }
                  onChanged();
                }}
              >
                Arsipkan
              </SmallButton>
            </>
          ) : (
            <>
              <SmallButton
                onClick={async () => {
                  const res = await fetch(`/api/products/${product.product_id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ is_active: true }),
                  });
                  if (!res.ok) {
                    const data = await res.json();
                    onError(data.error ?? "Gagal mengaktifkan ulang produk.");
                    return;
                  }
                  onChanged();
                }}
              >
                Aktifkan lagi
              </SmallButton>
              {/* Hapus Permanen (7 Sept 2026, fitur Sampah) -- SENGAJA cuma
                  muncul untuk produk yang SUDAH diarsipkan (2 langkah sadar:
                  arsipkan dulu, baru bisa hapus permanen), konsisten dengan
                  pola trash 2-tahap di Transaksi/Upload. Tidak reversibel. */}
              <SmallButton
                variant="danger"
                onClick={async () => {
                  if (
                    !confirm(
                      `Hapus "${product.name}" PERMANEN? Ini tidak bisa dibatalkan -- termasuk seluruh riwayat penyesuaian stoknya.`
                    )
                  )
                    return;
                  const res = await fetch(`/api/products/${product.product_id}/purge`, { method: "DELETE" });
                  if (!res.ok) {
                    const data = await res.json();
                    onError(data.error ?? "Gagal menghapus produk secara permanen.");
                    return;
                  }
                  onChanged();
                }}
              >
                Hapus Permanen
              </SmallButton>
            </>
          )}
        </div>
      )}

      {mode === "adjust" && (
        <AdjustStockForm
          product={product}
          onDone={() => {
            setMode("view");
            onChanged();
          }}
          onCancel={() => setMode("view")}
          onError={onError}
        />
      )}

      {mode === "edit" && (
        <EditProductForm
          product={product}
          onDone={() => {
            setMode("view");
            onChanged();
          }}
          onCancel={() => setMode("view")}
          onError={onError}
        />
      )}

      {mode === "history" && <StockHistory product={product} onClose={() => setMode("view")} />}
    </div>
  );
}

function AdjustStockForm({
  product,
  onDone,
  onCancel,
  onError,
}: {
  product: Product;
  onDone: () => void;
  onCancel: () => void;
  onError: (msg: string | null) => void;
}) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState(STOCK_REASONS[0]);
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(sign: 1 | -1) {
    onError(null);
    const n = Number(delta);
    if (isNaN(n) || n <= 0) {
      onError("Masukkan jumlah yang valid (angka positif).");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/products/${product.product_id}/adjust-stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta: n * sign, reason, reason_detail: detail || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      onError(data.error ?? "Gagal menyesuaikan stok.");
      return;
    }
    onDone();
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-dash-border pt-2">
      <p className="text-xs text-dash-muted">
        Stok saat ini: <span className="font-medium">{product.stock_qty} {product.unit}</span>
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          min="0"
          placeholder="Jumlah"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          className="w-24 rounded border border-dash-border bg-dash-surface px-2 py-1 text-sm text-dash-text outline-none focus:border-dash-accent"
          autoFocus
        />
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="flex-1 rounded border border-dash-border bg-dash-surface px-2 py-1 text-sm text-dash-text outline-none focus:border-dash-accent"
        >
          {STOCK_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <input
        placeholder="Catatan (opsional)"
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1 text-sm text-dash-text outline-none focus:border-dash-accent"
      />
      <div className="flex gap-2">
        <button
          onClick={() => submit(1)}
          disabled={saving}
          className="rounded bg-dash-green px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          + Tambah stok
        </button>
        <button
          onClick={() => submit(-1)}
          disabled={saving}
          className="rounded bg-dash-red px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          - Kurangi stok
        </button>
        <button onClick={onCancel} className="rounded px-3 py-1 text-xs text-dash-muted">
          Batal
        </button>
      </div>
    </div>
  );
}

function EditProductForm({
  product,
  onDone,
  onCancel,
  onError,
}: {
  product: Product;
  onDone: () => void;
  onCancel: () => void;
  onError: (msg: string | null) => void;
}) {
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category ?? "");
  const [unit, setUnit] = useState(product.unit);
  const [price, setPrice] = useState(product.price !== null ? String(product.price) : "");
  const [lowStockThreshold, setLowStockThreshold] = useState(
    product.low_stock_threshold !== null ? String(product.low_stock_threshold) : ""
  );
  const [saving, setSaving] = useState(false);

  async function submit() {
    onError(null);
    setSaving(true);
    const res = await fetch(`/api/products/${product.product_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category: category || null,
        unit,
        price: price === "" ? "" : price,
        low_stock_threshold: lowStockThreshold === "" ? "" : lowStockThreshold,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      onError(data.error ?? "Gagal menyimpan perubahan.");
      return;
    }
    onDone();
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-dash-border pt-2">
      <Field label="Nama produk">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1 text-sm text-dash-text outline-none focus:border-dash-accent"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Kategori">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1 text-sm text-dash-text outline-none focus:border-dash-accent"
          />
        </Field>
        <Field label="Satuan">
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1 text-sm text-dash-text outline-none focus:border-dash-accent"
          />
        </Field>
        <Field label="Harga jual (Rp)">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1 text-sm text-dash-text outline-none focus:border-dash-accent"
          />
        </Field>
        <Field label="Ambang stok menipis">
          <input
            type="number"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
            className="w-full rounded border border-dash-border bg-dash-surface px-2 py-1 text-sm text-dash-text outline-none focus:border-dash-accent"
          />
        </Field>
      </div>
      <p className="text-[10px] text-dash-muted">
        Stok ({product.stock_qty} {product.unit}) tidak diedit di sini — pakai &quot;Sesuaikan stok&quot;.
      </p>
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="rounded bg-dash-accent px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        <button onClick={onCancel} className="rounded px-3 py-1 text-xs text-dash-muted">
          Batal
        </button>
      </div>
    </div>
  );
}

function StockHistory({ product, onClose }: { product: Product; onClose: () => void }) {
  const [items, setItems] = useState<StockHistoryItem[] | null>(null);

  useEffect(() => {
    fetch(`/api/products/${product.product_id}/history`)
      .then((res) => res.json())
      .then(setItems);
  }, [product.product_id]);

  return (
    <div className="mt-2 border-t border-dash-border pt-2">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-dash-muted">Riwayat penyesuaian stok</p>
        <button onClick={onClose} className="text-xs text-dash-muted">
          Tutup
        </button>
      </div>
      {items === null ? (
        <p className="text-xs text-dash-muted">Memuat...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-dash-muted">Belum ada penyesuaian stok tercatat.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((h) => (
            <div key={h.adjustment_id} className="flex items-center justify-between text-xs">
              <span className={h.delta > 0 ? "text-dash-green" : "text-dash-red"}>
                {h.delta > 0 ? "+" : ""}
                {h.delta} {product.unit} · {h.reason}
                {h.reason_detail ? ` (${h.reason_detail})` : ""}
              </span>
              <span className="text-dash-muted">
                {new Date(h.performed_at).toLocaleDateString("id-ID")} → sisa {h.stock_after}
              </span>
            </div>
          ))}
        </div>
      )}
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

function SmallButton({
  children,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded border px-3 py-1 text-xs font-medium ${
        variant === "danger"
          ? "border-dash-border text-dash-red hover:bg-dash-surface-2"
          : "border-dash-border text-dash-text hover:bg-dash-surface-2"
      }`}
    >
      {children}
    </button>
  );
}
