/**
 * Recalculate prediction_changes.change_date from created_at (Colombia timezone).
 *
 * Usage: npx tsx scripts/fix-prediction-change-dates.ts
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getTournamentDateKeyFromIso } from "@/lib/changes/tournament-today";

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

  const { data: rows, error } = await admin
    .from("prediction_changes")
    .select("id, created_at, change_date, user_id, points_spent");

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  let updated = 0;
  for (const row of rows ?? []) {
    const correctDate = getTournamentDateKeyFromIso(row.created_at);
    if (row.change_date === correctDate) continue;

    const { error: updateErr } = await admin
      .from("prediction_changes")
      .update({ change_date: correctDate })
      .eq("id", row.id);

    if (updateErr) {
      console.error(`Failed ${row.id}:`, updateErr.message);
      continue;
    }

    console.log(`Fixed ${row.id}: ${row.change_date} → ${correctDate} (created ${row.created_at})`);
    updated++;
  }

  console.log(`Done. ${updated} row(s) updated of ${rows?.length ?? 0} total.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
