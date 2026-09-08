import { UploadCsvForm } from "@/components/UploadCsvForm";
import { AdminShell } from "@/components/AdminShell";

// 7 Sept 2026: sekarang pakai widget drag & drop yang sama dengan yang
// tadinya nyempil di Overview (lihat OVERVIEW_DECLUTTER_NOTES.md) --
// form lama (polos, tema ledger) dibuang total, bukan cuma disembunyikan.
export default function UploadPage() {
  return (
    <AdminShell>
      <div className="font-dash mx-auto max-w-2xl p-4 sm:p-6">
        <UploadCsvForm />
      </div>
    </AdminShell>
  );
}
