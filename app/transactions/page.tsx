import { TransactionsList } from "@/components/TransactionsList";
import { AdminShell } from "@/components/AdminShell";

// Dipindah dari AdminNav (dropdown navbar) ke AdminShell (sidebar +
// app-shell) 7 Sept 2026, supaya navigasi admin konsisten di semua
// halaman -- lihat komentar di components/AdminShell.tsx.
//
// 8 Sept 2026: TransactionsList sudah ikut direskin ke tema dash (lihat
// OVERVIEW_DECLUTTER_NOTES.md/riwayat diskusi) -- "font-dash" sekarang
// dipakai lagi di sini (sebelumnya sengaja TIDAK dipakai selagi
// komponennya masih tema ledger lama).
export default function TransactionsPage() {
  return (
    <AdminShell>
      <div className="font-dash mx-auto max-w-3xl p-4 sm:p-6">
        <TransactionsList />
      </div>
    </AdminShell>
  );
}
