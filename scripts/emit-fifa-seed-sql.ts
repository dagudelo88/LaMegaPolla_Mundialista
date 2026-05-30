/**
 * Emits SQL for FIFA 2026 seed (for MCP execute_sql or manual run).
 * Usage: npx tsx scripts/emit-fifa-seed-sql.ts > seed-fifa.sql
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dataDir = resolve(process.cwd(), "data/fifa-2026");
const teams: {
  fifa_code: string;
  name_es: string;
  name_en: string;
  group_letter: string;
  flag_emoji: string;
}[] = JSON.parse(readFileSync(resolve(dataDir, "teams.json"), "utf8"));

const groupMatches: {
  fifa_match_number: number;
  group_letter: string;
  home_code: string;
  away_code: string;
  matchday_key: string;
  kickoff_at: string;
  venue: string;
}[] = JSON.parse(readFileSync(resolve(dataDir, "group-matches.json"), "utf8"));

const knockoutMatches: {
  fifa_match_number: number;
  phase: string;
  kickoff_at: string;
  venue: string;
  home_source: unknown;
  away_source: unknown;
}[] = JSON.parse(readFileSync(resolve(dataDir, "knockout-matches.json"), "utf8"));

function esc(s: string) {
  return s.replace(/'/g, "''");
}

const lines: string[] = ["BEGIN;"];

for (const t of teams) {
  lines.push(
    `INSERT INTO public.teams (fifa_code, name_es, name_en, group_letter, flag_emoji) VALUES ('${esc(t.fifa_code)}', '${esc(t.name_es)}', '${esc(t.name_en)}', '${esc(t.group_letter)}', '${esc(t.flag_emoji)}') ON CONFLICT (fifa_code) DO UPDATE SET name_es = EXCLUDED.name_es, name_en = EXCLUDED.name_en, group_letter = EXCLUDED.group_letter, flag_emoji = EXCLUDED.flag_emoji;`
  );
}

const offsetMinutes = 60;

for (const m of groupMatches) {
  const kickoff = m.kickoff_at;
  const deadline = new Date(new Date(kickoff).getTime() - offsetMinutes * 60_000).toISOString();
  lines.push(
    `INSERT INTO public.matches (fifa_match_number, phase, group_letter, home_team_id, away_team_id, home_source, away_source, kickoff_at, prediction_deadline, venue, matchday_key, status) VALUES (${m.fifa_match_number}, 'group_stage', '${esc(m.group_letter)}', (SELECT id FROM public.teams WHERE fifa_code = '${esc(m.home_code)}'), (SELECT id FROM public.teams WHERE fifa_code = '${esc(m.away_code)}'), NULL, NULL, '${kickoff}', '${deadline}', '${esc(m.venue)}', '${esc(m.matchday_key)}', 'scheduled') ON CONFLICT (fifa_match_number) DO UPDATE SET phase = EXCLUDED.phase, group_letter = EXCLUDED.group_letter, home_team_id = EXCLUDED.home_team_id, away_team_id = EXCLUDED.away_team_id, kickoff_at = EXCLUDED.kickoff_at, prediction_deadline = EXCLUDED.prediction_deadline, venue = EXCLUDED.venue, matchday_key = EXCLUDED.matchday_key, status = EXCLUDED.status;`
  );
}

for (const m of knockoutMatches) {
  const kickoff = m.kickoff_at;
  const deadline = new Date(new Date(kickoff).getTime() - offsetMinutes * 60_000).toISOString();
  const homeJson = esc(JSON.stringify(m.home_source));
  const awayJson = esc(JSON.stringify(m.away_source));
  lines.push(
    `INSERT INTO public.matches (fifa_match_number, phase, group_letter, home_team_id, away_team_id, home_source, away_source, kickoff_at, prediction_deadline, venue, matchday_key, status) VALUES (${m.fifa_match_number}, '${esc(m.phase)}', NULL, NULL, NULL, '${homeJson}'::jsonb, '${awayJson}'::jsonb, '${kickoff}', '${deadline}', '${esc(m.venue)}', 'knockout_${esc(m.phase)}_${m.fifa_match_number}', 'scheduled') ON CONFLICT (fifa_match_number) DO UPDATE SET phase = EXCLUDED.phase, home_team_id = NULL, away_team_id = NULL, home_source = EXCLUDED.home_source, away_source = EXCLUDED.away_source, kickoff_at = EXCLUDED.kickoff_at, prediction_deadline = EXCLUDED.prediction_deadline, venue = EXCLUDED.venue, matchday_key = EXCLUDED.matchday_key, status = EXCLUDED.status;`
  );
}

lines.push("COMMIT;");

const outPath = process.argv.includes("--write")
  ? resolve(process.cwd(), "data/fifa-2026/seed.sql")
  : null;

const output = lines.join("\n");
if (outPath) {
  writeFileSync(outPath, output, "utf8");
  console.error(`Wrote ${outPath}`);
} else {
  console.log(output);
}
