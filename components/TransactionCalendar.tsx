"use client";

// Copy to: components/TransactionCalendar.tsx
//
// Kalender transaksi (12 Sept 2026) -- klik tanggal, muncul semua
// transaksi tanggal itu, DIPISAH per channel (Shopee/TikTokShop/dst,
// tidak dicampur). Navigasi maju/mundur per bulan (otomatis lintas tahun
// kalau digeser terus). Titik hijau kecil di bawah tanggal = ada
// transaksi di hari itu.

import { useEffect, useState } from "react";

interface DaySummary {
  date: string;
  count: number;
  revenue: number;
}

interface DayTxnLine {
  product_or_service: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface DayTxn {
  row_id: string;
  transaction_date: string;
  transaction_time: string | null;
  total_amount: number;
  channel: string;
  lines: DayTxnLine[];
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const WEEKDAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function fmtDate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}
function formatRupiah(n: number): string {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

export function TransactionCalendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11
  const [summary, setSummary] = useState<Record<string, DaySummary> | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayTxns, setDayTxns] = useState<DayTxn[] | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());

  const MAX_VISIBLE = 4;

  useEffect(() => {
    setSummary(null);
    fetch(`/api/transactions-calendar?year=${viewYear}&month=${viewMonth + 1}`)
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, DaySummary> = {};
        for (const d of data.days ?? []) map[d.date] = d;
        setSummary(map);
      })
      .catch(() => setSummary({}));
  }, [viewYear, viewMonth]);

  function goPrevMonth() {
    setSelectedDate(null);
    setDayTxns(null);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function goNextMonth() {
    setSelectedDate(null);
    setDayTxns(null);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setDayTxns(null);
    setError(null);
    setExpandedChannels(new Set());
    setLoadingDay(true);
    fetch(`/api/transactions-by-date?date=${dateStr}`)
      .then((r) => r.json())
      .then((data) => {
        setDayTxns(data.transactions ?? []);
        setLoadingDay(false);
      })
      .catch(() => {
        setError("Gagal memuat transaksi tanggal ini.");
        setLoadingDay(false);
      });
  }

  // Bangun grid kalender: offset hari-hari kosong di awal (Senin = 0),
  // lalu tanggal 1..akhir bulan, digenapkan ke kelipatan 7 di akhir.
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const offset = (firstOfMonth.getDay() + 6) % 7; // Senin=0 ... Minggu=6
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate());

  const grouped: Record<string, DayTxn[]> = {};
  for (const t of dayTxns ?? []) {
    (grouped[t.channel] ||= []).push(t);
  }
  const dayTotal = (dayTxns ?? []).reduce((sum, t) => sum + t.total_amount, 0);

  return (
    <div className="ledger-card p-4">
      <p className="mb-3 text-sm font-semibold text-ink">Riwayat Transaksi</p>

      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={goPrevMonth}
          className="rounded border border-rule px-2.5 py-1 text-sm text-ink hover:bg-[#f1ecd9]"
          aria-label="Bulan sebelumnya"
        >
          ←
        </button>
        <p className="text-sm font-semibold text-ink">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </p>
        <button
          onClick={goNextMonth}
          className="rounded border border-rule px-2.5 py-1 text-sm text-ink hover:bg-[#f1ecd9]"
          aria-label="Bulan berikutnya"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="text-[10px] font-medium text-muted">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateStr = fmtDate(viewYear, viewMonth, day);
          const info = summary?.[dateStr];
          const hasData = !!info && info.count > 0;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          return (
            <button
              key={i}
              onClick={() => selectDate(dateStr)}
              className="flex flex-col items-center gap-0.5 rounded py-1.5 text-xs transition"
              style={{
                background: isSelected ? "#142850" : isToday ? "#eee2bd" : "transparent",
                color: isSelected ? "#fffdf6" : "#211d16",
              }}
            >
              <span className={isSelected ? "font-bold" : ""}>{day}</span>
              <span
                className="h-1 w-1 rounded-full"
                style={{ background: hasData ? (isSelected ? "#fffdf6" : "#1f6d47") : "transparent" }}
              />
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-4 border-t border-dashed pt-3" style={{ borderColor: "#d8d2bd" }}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-ink">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            {dayTxns !== null && dayTxns.length > 0 && (
              <p className="text-xs font-bold" style={{ color: "#1f6d47" }}>
                {formatRupiah(dayTotal)}
              </p>
            )}
          </div>

          {loadingDay && <p className="text-xs text-muted">Memuat...</p>}
          {error && <p className="text-xs text-ledger-red">{error}</p>}

          {!loadingDay && dayTxns !== null && dayTxns.length === 0 && (
            <p className="text-xs text-muted">Tidak ada transaksi di tanggal ini.</p>
          )}

          {!loadingDay &&
            dayTxns !== null &&
            Object.entries(grouped).map(([channel, txns]) => {
              const channelTotal = txns.reduce((s, t) => s + t.total_amount, 0);
              const isExpanded = expandedChannels.has(channel);
              const visibleTxns = isExpanded ? txns : txns.slice(0, MAX_VISIBLE);
              const hiddenCount = txns.length - visibleTxns.length;

              function toggleExpand() {
                setExpandedChannels((prev) => {
                  const next = new Set(prev);
                  if (next.has(channel)) next.delete(channel);
                  else next.add(channel);
                  return next;
                });
              }

              return (
                <div key={channel} className="mb-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{channel}</p>
                    <p className="text-[11px] font-medium text-ink">{formatRupiah(channelTotal)}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {visibleTxns.map((t) => (
                      <div key={t.row_id} className="rounded px-2 py-1.5 text-xs" style={{ background: "#f8f4e6" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-muted">{t.transaction_time ?? "-"}</span>
                          <span className="font-semibold text-ink">{formatRupiah(t.total_amount)}</span>
                        </div>
                        {t.lines.length > 0 && (
                          <div
                            className="mt-1 flex flex-col gap-0.5 border-t border-dashed pt-1"
                            style={{ borderColor: "#e3dcc8" }}
                          >
                            {t.lines.map((l, i) => (
                              <div key={i} className="flex items-center justify-between gap-2 text-[11px] text-muted">
                                <span className="truncate">
                                  {l.quantity % 1 === 0 ? l.quantity : l.quantity.toFixed(1)}x {l.product_or_service}
                                </span>
                                <span className="shrink-0">{formatRupiah(l.subtotal)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {txns.length > MAX_VISIBLE && (
                    <button
                      onClick={toggleExpand}
                      className="mt-1 text-[11px] font-medium hover:underline"
                      style={{ color: "#b8863d" }}
                    >
                      {isExpanded ? "Sembunyikan" : `Lihat semua (${hiddenCount} lagi)`}
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
