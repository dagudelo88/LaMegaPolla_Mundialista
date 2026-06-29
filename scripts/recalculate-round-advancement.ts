/**
 * Liquidate round advancement bonuses (+2 per correct team) for all users.
 *
 * Usage: npm run recalculate-round-advancement
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveOfficialBracket } from "@/lib/bracket/resolve-official-bracket";
import { loadBracketContext } from "@/lib/scoring/bracket-context";
import { processAllCompletedRoundAdvancementBonuses } from "@/lib/scoring/process-round-advancement-bonus";
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
  const bracketCtx = await loadBracketContext(admin);
  const result = await processAllCompletedRoundAdvancementBonuses(admin, bracketCtx);
  console.log(
    `Round advancement: ${result.roundsProcessed} round(s), ${result.usersScored} user(s) updated.`
  );

  const totalsUpdated = await recalculateAllActiveParticipantTotals(admin);
  console.log(`Profile totals recalculated for ${totalsUpdated} participant(s).`);

  const users = ["Murcilui_EL_Oraculo", "Yuls", "Nicostradamus_Gonzalez"];
  for (const username of users) {
    const { data: p } = await admin
      .from("profiles")
      .select("id, total_points")
      .eq("username", username)
      .maybeSingle();
    if (!p) continue;
    const { data: adv } = await admin
      .from("user_advancement_bonus_points")
      .select("bonus_key, points")
      .eq("user_id", p.id)
      .like("bonus_key", "round:%");
    console.log(`@${username}: total=${p.total_points} round_bonuses=${JSON.stringify(adv)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
