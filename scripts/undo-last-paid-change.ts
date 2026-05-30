/**
 * Revert the most recent paid change for a user (testing / admin).
 *
 * Usage: npx tsx scripts/undo-last-paid-change.ts [username]
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { recalculateUserTotalPoints } from "@/lib/scoring/recalculate-total-points";

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

  const username = process.argv[2] ?? "Murcilui_EL_Oraculo";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, username, total_points")
    .eq("username", username)
    .maybeSingle();

  if (profileErr || !profile) {
    console.error(profileErr?.message ?? `User not found: ${username}`);
    process.exit(1);
  }

  const { data: change, error: changeErr } = await admin
    .from("prediction_changes")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (changeErr || !change) {
    console.error(changeErr?.message ?? "No paid changes found for this user.");
    process.exit(1);
  }

  console.log(
    `Reverting change ${change.id}: ${change.old_home}-${change.old_away} ← was ${change.new_home}-${change.new_away} (+${change.points_spent} pts refund)`
  );

  const isDraw = change.old_home === change.old_away;
  const { error: predErr } = await admin
    .from("predictions")
    .update({
      predicted_home: change.old_home,
      predicted_away: change.old_away,
      predicted_is_draw: isDraw,
      predicted_advances_team_id: change.old_advances_team_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", change.prediction_id)
    .eq("user_id", profile.id);

  if (predErr) {
    console.error("Failed to revert prediction:", predErr.message);
    process.exit(1);
  }

  const { error: delErr } = await admin
    .from("prediction_changes")
    .delete()
    .eq("id", change.id);

  if (delErr) {
    console.error("Failed to delete change record:", delErr.message);
    process.exit(1);
  }

  const total = await recalculateUserTotalPoints(admin, profile.id);

  console.log(`Done. @${profile.username} total_points=${total} (was ${profile.total_points}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
