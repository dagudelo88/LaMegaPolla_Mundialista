/**
 * Re-score a single finished match (by FIFA match number).
 *
 * Usage: npx tsx scripts/reprocess-match.ts 73
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { processMatchResult } from "@/lib/scoring/process-match-result";

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

async function main() {
  loadEnvLocal();

  const fifaMatchNumber = Number(process.argv[2]);
  if (!Number.isFinite(fifaMatchNumber)) {
    console.error("Usage: npx tsx scripts/reprocess-match.ts <fifa_match_number>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: match, error } = await admin
    .from("matches")
    .select(
      "id, phase, home_score, away_score, home_team_id, away_team_id, result_advances_team_id, fifa_match_number"
    )
    .eq("fifa_match_number", fifaMatchNumber)
    .single();

  if (error || !match) {
    console.error(error?.message ?? `Match #${fifaMatchNumber} not found`);
    process.exit(1);
  }

  const result = await processMatchResult(admin, {
    matchId: match.id,
    phase: match.phase as MatchPhase,
    homeScore: match.home_score!,
    awayScore: match.away_score!,
    homeTeamId: match.home_team_id,
    awayTeamId: match.away_team_id,
    resultAdvancesTeamId: match.result_advances_team_id,
  });

  console.log(
    `Match #${fifaMatchNumber}: scored ${result.usersScored}/${result.eligibleCount} eligible prediction(s).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
