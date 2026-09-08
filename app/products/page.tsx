import { ProductsList } from "@/components/ProductsList";
import { AdminShell } from "@/components/AdminShell";

export default function Page() {
  return (
    <AdminShell>
      <ProductsList />
    </AdminShell>
  );
}
