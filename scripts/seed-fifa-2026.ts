/**
 * Seed FIFA World Cup 2026 teams and matches from data/fifa-2026/*.json
 * Usage: npx tsx scripts/seed-fifa-2026.ts
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

interface TeamRow {
  fifa_code: string;
  name_es: string;
  name_en: string;
  group_letter: string;
  flag_emoji: string;
}

interface GroupMatchRow {
  fifa_match_number: number;
  group_letter: string;
  home_code: string;
  away_code: string;
  matchday_key: string;
  kickoff_at: string;
  venue: string;
}

interface KnockoutMatchRow {
  fifa_match_number: number;
  phase: string;
  kickoff_at: string;
  venue: string;
  home_source: unknown;
  away_source: unknown;
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const dataDir = resolve(process.cwd(), "data/fifa-2026");
  const teams: TeamRow[] = JSON.parse(readFileSync(resolve(dataDir, "teams.json"), "utf8"));
  const groupMatches: GroupMatchRow[] = JSON.parse(
    readFileSync(resolve(dataDir, "group-matches.json"), "utf8")
  );
  const knockoutMatches: KnockoutMatchRow[] = JSON.parse(
    readFileSync(resolve(dataDir, "knockout-matches.json"), "utf8")
  );

  const supabase = createClient(url, key);

  const { data: offsetRow } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "tournament.deadline_offset_minutes")
    .maybeSingle();

  const offsetMinutes =
    typeof offsetRow?.value === "number"
      ? offsetRow.value
      : Number(offsetRow?.value ?? 60) || 60;

  const { data: seededTeams, error: teamErr } = await supabase
    .from("teams")
    .upsert(teams, { onConflict: "fifa_code" })
    .select("id, fifa_code");

  if (teamErr) {
    console.error("teams:", teamErr.message);
    process.exit(1);
  }

  const codeToId = new Map(seededTeams?.map((t) => [t.fifa_code, t.id]) ?? []);

  for (const m of groupMatches) {
    const homeId = codeToId.get(m.home_code);
    const awayId = codeToId.get(m.away_code);
    if (!homeId || !awayId) {
      console.error(`Missing team for match ${m.fifa_match_number}: ${m.home_code} vs ${m.away_code}`);
      process.exit(1);
    }
    const kickoff = new Date(m.kickoff_at);
    const deadline = new Date(kickoff.getTime() - offsetMinutes * 60_000);

    const { error } = await supabase.from("matches").upsert(
      {
        fifa_match_number: m.fifa_match_number,
        phase: "group_stage",
        group_letter: m.group_letter,
        home_team_id: homeId,
        away_team_id: awayId,
        home_source: null,
        away_source: null,
        kickoff_at: kickoff.toISOString(),
        prediction_deadline: deadline.toISOString(),
        venue: m.venue,
        matchday_key: m.matchday_key,
        status: "scheduled",
      },
      { onConflict: "fifa_match_number" }
    );
    if (error) {
      console.error(`match ${m.fifa_match_number}:`, error.message);
      process.exit(1);
    }
  }

  for (const m of knockoutMatches) {
    const kickoff = new Date(m.kickoff_at);
    const deadline = new Date(kickoff.getTime() - offsetMinutes * 60_000);

    const { error } = await supabase.from("matches").upsert(
      {
        fifa_match_number: m.fifa_match_number,
        phase: m.phase,
        group_letter: null,
        home_team_id: null,
        away_team_id: null,
        home_source: m.home_source,
        away_source: m.away_source,
        kickoff_at: kickoff.toISOString(),
        prediction_deadline: deadline.toISOString(),
        venue: m.venue,
        matchday_key: `knockout_${m.phase}_${m.fifa_match_number}`,
        status: "scheduled",
      },
      { onConflict: "fifa_match_number" }
    );
    if (error) {
      console.error(`knockout ${m.fifa_match_number}:`, error.message);
      process.exit(1);
    }
  }

  console.log(
    `OK: ${teams.length} teams, ${groupMatches.length} group + ${knockoutMatches.length} knockout matches seeded.`
  );
}

main();
