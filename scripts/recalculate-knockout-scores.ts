/**
 * Recalculate points for finished knockout matches only (§7 slot gate fix).
 *
 * Usage: npm run recalculate-knockout-scores
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveOfficialBracket } from "@/lib/bracket/resolve-official-bracket";
import { KNOCKOUT_PHASES } from "@/lib/scoring/knockout-phase-order";
import { recalculateFinishedKnockoutMatches } from "@/lib/scoring/recalculate-all-finished-matches";
import { recalculateAllActiveParticipantTotals } from "@/lib/scoring/recalculate-total-points";

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

  await resolveOfficialBracket(admin);
  console.log("Official bracket resolved.");

  const { count } = await admin
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("status", "finished")
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .in("phase", [...KNOCKOUT_PHASES]);

  console.log(`Recalculating ${count ?? 0} finished knockout match(es)...`);

  const result = await recalculateFinishedKnockoutMatches(admin, (current, total) => {
    console.log(`  Match ${current}/${total}...`);
  });

  console.log(
    `Recalculated ${result.matchesProcessed} knockout match(es), ${result.scoringPasses} scoring pass(es).`
  );

  const totalsUpdated = await recalculateAllActiveParticipantTotals(admin);
  console.log(`Profile totals recalculated for ${totalsUpdated} participant(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
