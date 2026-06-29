/**
 * Backfill locked submissions and recalculate points for all finished matches.
 *
 * Usage: npm run recalculate-scores
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  backfillLockedSubmissions,
  recalculateAllFinishedMatches,
} from "@/lib/scoring/recalculate-all-finished-matches";
import { recalculateAllJornadaBonuses } from "@/lib/scoring/recalculate-all-jornada-bonuses";
import { recalculateAllActiveParticipantTotals } from "@/lib/scoring/recalculate-total-points";
import { resolveOfficialBracket } from "@/lib/bracket/resolve-official-bracket";

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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const usersBackfilled = await backfillLockedSubmissions(admin);
  console.log(`Locked predictions for ${usersBackfilled} participant(s).`);

  await resolveOfficialBracket(admin);
  console.log("Official bracket resolved.");

  const { data: finishedMatches } = await admin
    .from("matches")
    .select("id")
    .eq("status", "finished")
    .not("home_score", "is", null)
    .not("away_score", "is", null);
  console.log(`Recalculating ${finishedMatches?.length ?? 0} finished match(es)...`);

  const result = await recalculateAllFinishedMatches(admin, (current, total) => {
    if (current === 1 || current === total || current % 10 === 0) {
      console.log(`  Match ${current}/${total}...`);
    }
  });
  console.log(
    `Recalculated ${result.matchesProcessed} finished match(es), ${result.scoringPasses} scoring pass(es).`
  );

  const jornadaResult = await recalculateAllJornadaBonuses(admin);
  console.log(
    `Jornada bonuses: ${jornadaResult.jornadasProcessed} jornada(s), ${jornadaResult.usersScored} user score(s).`
  );

  const totalsUpdated = await recalculateAllActiveParticipantTotals(admin);
  console.log(`Profile totals recalculated for ${totalsUpdated} participant(s).`);

  const { data: top } = await admin
    .from("profiles")
    .select("username, total_points")
    .not("username", "is", null)
    .not("invite_redeemed_at", "is", null)
    .order("total_points", { ascending: false })
    .limit(10);

  console.log("\nTop positions:");
  for (const row of top ?? []) {
    console.log(`  @${row.username}: ${row.total_points} pts`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
