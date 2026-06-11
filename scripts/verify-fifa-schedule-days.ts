/**
 * Verifies group/knockout JSON fifa_schedule_date against official-fifa-schedule-by-day.json.
 * Usage: npm run verify-fifa-schedule-days
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dataDir = resolve(process.cwd(), "data/fifa-2026");

type MatchRow = { fifa_match_number: number; fifa_schedule_date: string; kickoff_at: string };

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(resolve(dataDir, file), "utf8")) as T;
}

function main() {
  const scheduleByDay = loadJson<Record<string, number[]>>("official-fifa-schedule-by-day.json");
  const group = loadJson<MatchRow[]>("group-matches.json");
  const knockout = loadJson<MatchRow[]>("knockout-matches.json");
  const allMatches = [...group, ...knockout].sort(
    (a, b) => a.fifa_match_number - b.fifa_match_number
  );

  const byDateFromMatches = new Map<string, number[]>();
  for (const m of allMatches) {
    const list = byDateFromMatches.get(m.fifa_schedule_date) ?? [];
    list.push(m.fifa_match_number);
    byDateFromMatches.set(m.fifa_schedule_date, list);
  }

  let errors = 0;
  const allDates = new Set([
    ...Object.keys(scheduleByDay),
    ...byDateFromMatches.keys(),
  ]);

  for (const date of [...allDates].sort()) {
    const expected = [...(scheduleByDay[date] ?? [])].sort((a, b) => a - b);
    const actual = [...(byDateFromMatches.get(date) ?? [])].sort((a, b) => a - b);
    const expectedStr = expected.join(", ") || "(none)";
    const actualStr = actual.join(", ") || "(none)";

    if (expectedStr !== actualStr) {
      errors++;
      console.error(`✗ ${date}: expected [${expectedStr}], got [${actualStr}]`);
    } else {
      console.log(`✓ ${date}: ${actual.length} match(es) — ${actualStr}`);
    }
  }

  if (allMatches.length !== 104) {
    errors++;
    console.error(`✗ Expected 104 matches, got ${allMatches.length}`);
  }

  for (const m of allMatches) {
    const refDay = scheduleByDay[m.fifa_schedule_date];
    if (!refDay?.includes(m.fifa_match_number)) {
      errors++;
      console.error(
        `✗ M${m.fifa_match_number}: fifa_schedule_date=${m.fifa_schedule_date} not in reference`
      );
    }
  }

  if (errors) {
    console.error(`\n${errors} error(s).`);
    process.exit(1);
  }

  console.log(`\nOK: all ${allMatches.length} matches align with official FIFA schedule days.`);
}

main();
