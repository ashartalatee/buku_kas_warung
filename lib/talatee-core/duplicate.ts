import { randomUUID } from "crypto";
import { ExtractedTransaction } from "./types";
import { Db } from "./db";

/**
 * Business-fingerprint duplicate scoring (per SPEC.md §13):
 * weighted score across fields, two thresholds. Weights/thresholds below
 * are the starting hypothesis, meant to be tuned on real data — not a
 * final calibration.
 *
 * IMPORTANT: date/time compared here must be the transaction's own
 * date/time (from the source), never an upload timestamp.
 */
const WEIGHTS = {
  date: 30,
  time: 20, // within +/- 2 minutes
  total: 30,
  lineCount: 10,
  itemsExact: 10,
};
const HIGH_CONFIDENCE_THRESHOLD = 80; // >= this -> flag as POTENTIAL_DUPLICATE
const CANDIDATE_FLOOR = 50; // < this -> not even considered a candidate

export interface FingerprintMatch {
  row_id: string;
  score: number;
  matchedFields: string[];
}

export async function findFingerprintMatches(
  db: Db,
  business_id: string,
  txn: ExtractedTransaction,
  exclude_row_id?: string
): Promise<FingerprintMatch[]> {
  const candidates = (await db.all(
    `SELECT row_id, transaction_date, transaction_time, total_amount, line_item_count
       FROM transactions
       WHERE business_id = $1 AND status = 'ACTIVE' AND transaction_date = $2 AND row_id != $3`,
    [business_id, txn.transaction_date, exclude_row_id ?? ""]
  )) as {
    row_id: string;
    transaction_date: string;
    transaction_time: string | null;
    total_amount: number;
    line_item_count: number;
  }[];

  const matches: FingerprintMatch[] = [];

  for (const c of candidates) {
    let score = 0;
    const matchedFields: string[] = [];

    // date already filtered by the query, so it always matches here
    score += WEIGHTS.date;
    matchedFields.push("date");

    if (txn.transaction_time && c.transaction_time) {
      const diffMin = Math.abs(minutesSince(txn.transaction_time) - minutesSince(c.transaction_time));
      if (diffMin <= 2) {
        score += WEIGHTS.time;
        matchedFields.push("time");
      }
    }

    if (Math.abs(c.total_amount - txn.total_amount) < 0.01) {
      score += WEIGHTS.total;
      matchedFields.push("total");
    }

    if (c.line_item_count === txn.lines.length) {
      score += WEIGHTS.lineCount;
      matchedFields.push("line_item_count");
    }

    // exact item match: compare product names + qty of this candidate's lines
    const candidateLines = (await db.all(
      `SELECT product_or_service, quantity, unit_price FROM transaction_lines WHERE transaction_row_id = $1`,
      [c.row_id]
    )) as { product_or_service: string; quantity: number; unit_price: number }[];

    if (linesMatchExactly(candidateLines, txn.lines)) {
      score += WEIGHTS.itemsExact;
      matchedFields.push("items");
    }

    if (score >= CANDIDATE_FLOOR) {
      matches.push({ row_id: c.row_id, score, matchedFields });
    }
  }

  return matches.filter((m) => m.score >= HIGH_CONFIDENCE_THRESHOLD);
}

export async function createDuplicateFlag(
  db: Db,
  business_id: string,
  transaction_row_id: string,
  candidate_row_id: string,
  match: FingerprintMatch
) {
  await db.run(
    `INSERT INTO duplicate_flags
       (flag_id, business_id, transaction_row_id, candidate_row_id, match_type, match_score, matched_fields, resolution_status)
     VALUES ($1, $2, $3, $4, 'POTENTIAL_DUPLICATE', $5, $6, 'PENDING')`,
    [randomUUID(), business_id, transaction_row_id, candidate_row_id, match.score, JSON.stringify(match.matchedFields)]
  );
}

function minutesSince(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function linesMatchExactly(
  a: { product_or_service: string; quantity: number; unit_price: number }[],
  b: { product_or_service: string; quantity: number; unit_price: number }[]
): boolean {
  if (a.length !== b.length) return false;
  const sortKey = (l: { product_or_service: string; quantity: number }) =>
    `${l.product_or_service.toLowerCase()}|${l.quantity}`;
  const sortedA = [...a].sort((x, y) => sortKey(x).localeCompare(sortKey(y)));
  const sortedB = [...b].sort((x, y) => sortKey(x).localeCompare(sortKey(y)));
  return sortedA.every(
    (line, i) =>
      line.product_or_service.trim().toLowerCase() ===
        sortedB[i].product_or_service.trim().toLowerCase() &&
      Math.abs(line.quantity - sortedB[i].quantity) < 0.001
  );
}
