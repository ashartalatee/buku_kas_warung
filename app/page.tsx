import { OverviewPage } from "@/components/OverviewPage";
import Link from "next/link";

export default function Page() {
  return (
    <div>
      <div style={{ maxWidth: "32rem", margin: "0 auto", padding: "1rem 1rem 0" }}>
        <Link href="/transactions" style={{ fontSize: "0.875rem", color: "#2563eb" }}>
          Lihat semua transaksi &rarr;
        </Link>
      </div>
      <OverviewPage />
    </div>
  );
}