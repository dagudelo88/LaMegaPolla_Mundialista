/**
 * Compare generated FIFA JSON kickoffs against official-kickoffs-utc.json.
 * Run: npx tsx scripts/verify-fifa-kickoffs.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatMatchDateSortKey,
  formatMatchTime,
} from "../lib/matches/format-datetime";

type KickoffRef = { fifa_match_number: number; kickoff_at: string };
type MatchRow = KickoffRef & { home_code?: string; away_code?: string };

const dataDir = resolve(process.cwd(), "data/fifa-2026");

function load<T>(file: string): T {
  return JSON.parse(readFileSync(resolve(dataDir, file), "utf8")) as T;
}

const official = load<KickoffRef[]>("official-kickoffs-utc.json");
const group = load<MatchRow[]>("group-matches.json");
const knockout = load<MatchRow[]>("knockout-matches.json");
const generated = [...group, ...knockout].sort(
  (a, b) => a.fifa_match_number - b.fifa_match_number
);

let mismatches = 0;

for (const ref of official) {
  const row = generated.find((m) => m.fifa_match_number === ref.fifa_match_number);
  if (!row) {
    console.error(`Missing match ${ref.fifa_match_number}`);
    mismatches++;
    continue;
  }
  if (row.kickoff_at !== ref.kickoff_at) {
    console.error(
      `Match ${ref.fifa_match_number}: expected ${ref.kickoff_at}, got ${row.kickoff_at} (CO ${formatMatchTime(row.kickoff_at)} ${formatMatchDateSortKey(row.kickoff_at)})`
    );
    mismatches++;
  }
}

if (mismatches === 0) {
  console.log(`All ${official.length} kickoffs match official-kickoffs-utc.json.`);
  process.exit(0);
}

console.error(`${mismatches} mismatch(es).`);
process.exit(1);
