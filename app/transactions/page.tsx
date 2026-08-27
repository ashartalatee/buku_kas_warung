import { TransactionsList } from "@/components/TransactionsList";

export default function TransactionsPage() {
  return (
    <div style={{ maxWidth: "32rem", margin: "0 auto", padding: "1rem" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
        Semua Transaksi
      </h1>
      <TransactionsList />
    </div>
  );
}