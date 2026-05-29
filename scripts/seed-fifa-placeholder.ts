/**
 * Placeholder seed for Phase 1 — extend with full FIFA 2026 data.
 * Usage: npx tsx scripts/seed-fifa-placeholder.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

const SAMPLE_TEAMS = [
  { fifa_code: "MEX", name_es: "México", name_en: "Mexico", group_letter: "A", flag_emoji: "🇲🇽" },
  { fifa_code: "ARG", name_es: "Argentina", name_en: "Argentina", group_letter: "A", flag_emoji: "🇦🇷" },
  { fifa_code: "ESP", name_es: "España", name_en: "Spain", group_letter: "B", flag_emoji: "🇪🇸" },
  { fifa_code: "FRA", name_es: "Francia", name_en: "France", group_letter: "B", flag_emoji: "🇫🇷" },
];

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data: teams, error: teamErr } = await supabase
    .from("teams")
    .upsert(SAMPLE_TEAMS, { onConflict: "fifa_code" })
    .select();

  if (teamErr) {
    console.error("teams:", teamErr.message);
    process.exit(1);
  }

  const mex = teams?.find((t) => t.fifa_code === "MEX");
  const arg = teams?.find((t) => t.fifa_code === "ARG");
  if (!mex || !arg) {
    console.error("Missing sample teams");
    process.exit(1);
  }

  const kickoff = new Date("2026-06-11T19:00:00Z");
  const deadline = new Date("2026-06-11T18:00:00Z");

  const { error: matchErr } = await supabase.from("matches").upsert(
    {
      fifa_match_number: 1,
      phase: "group_stage",
      group_letter: "A",
      home_team_id: mex.id,
      away_team_id: arg.id,
      kickoff_at: kickoff.toISOString(),
      prediction_deadline: deadline.toISOString(),
      venue: "Estadio Ciudad de México",
      status: "scheduled",
    },
    { onConflict: "fifa_match_number" }
  );

  if (matchErr) {
    console.error("matches:", matchErr.message);
    process.exit(1);
  }

  console.log("OK: placeholder teams and 1 group match seeded.");
}

main();
