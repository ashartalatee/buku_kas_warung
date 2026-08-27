"use client";

// Copy to: components/DataInboxList.tsx
//
// Answers "file saya sudah masuk?" per SPEC.md §8. A FAILED upload is
// never dropped silently — it shows here with its failure_reason and
// a re-upload prompt, forever (or until the user fixes and re-uploads
// successfully), consistent with "never silently fail."

import { useEffect, useState } from "react";

interface SourceRow {
  source_id: string;
  original_filename: string;
  status: "RECEIVED" | "PROCESSING" | "COMPLETED" | "FAILED";
  failure_reason: string | null;
  row_count: number | null;
  processed_row_count: number;
  uploaded_at: string;
}

const STATUS_ICON: Record<SourceRow["status"], string> = {
  RECEIVED: "⏳",
  PROCESSING: "⏳",
  COMPLETED: "✅",
  FAILED: "❌",
};

export function DataInboxList({ onRetry }: { onRetry?: () => void }) {
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/sources");
      setRows(await res.json());
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm text-neutral-400">Memuat...</p>;
  if (rows.length === 0) return <p className="text-sm text-neutral-400">Belum ada file diupload.</p>;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <p className="border-b border-neutral-100 p-4 text-sm font-medium text-neutral-700">
        Data Inbox
      </p>
      {rows.map((row) => (
        <div key={row.source_id} className="flex items-start justify-between border-b border-neutral-100 p-3 last:border-0">
          <div>
            <p className="text-sm">
              {STATUS_ICON[row.status]} {row.original_filename}
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              {row.uploaded_at}
              {row.status === "COMPLETED" &&
                ` · ${row.processed_row_count}/${row.row_count} baris diproses`}
            </p>
            {row.status === "FAILED" && (
              <p className="mt-1 text-xs text-red-600">{row.failure_reason}</p>
            )}
          </div>
          {row.status === "FAILED" && (
            <button
              onClick={onRetry}
              className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-medium"
            >
              Upload ulang
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
