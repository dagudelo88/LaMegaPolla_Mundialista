/**
 * Wipe test game data and reset the pool for a real launch.
 *
 * - Clears predictions, scoring, transparency history, submissions
 * - Resets all match results to scheduled
 * - Deletes @megapolla.test users
 * - Resets remaining profiles (points, payment flags) — keeps admin accounts
 *
 * Usage:
 *   npm run reset-for-production          # execute
 *   npm run reset-for-production -- --dry-run
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const TEST_EMAIL_SUFFIX = "@megapolla.test";

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

async function deleteAllRows(
  admin: SupabaseClient,
  table: string,
  filter: { column: string; op: "not_null" | "gte_zero" } = {
    column: "id",
    op: "not_null",
  }
) {
  let query = admin.from(table).delete({ count: "exact" });
  if (filter.op === "gte_zero") {
    query = query.gte(filter.column, 0);
  } else {
    query = query.not(filter.column, "is", null);
  }
  const { error, count } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function listAllUsers(admin: SupabaseClient) {
  const users: { id: string; email?: string }[] = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers: ${error.message}`);
    users.push(...data.users.map((u) => ({ id: u.id, email: u.email })));
    if (data.users.length < perPage) break;
    page += 1;
  }
  return users;
}

async function main() {
  loadEnvLocal();

  const dryRun = process.argv.includes("--dry-run");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const users = await listAllUsers(admin);
  const testUsers = users.filter((u) =>
    u.email?.toLowerCase().endsWith(TEST_EMAIL_SUFFIX)
  );
  const keepUsers = users.filter(
    (u) => !u.email?.toLowerCase().endsWith(TEST_EMAIL_SUFFIX)
  );

  console.log(dryRun ? "DRY RUN — no changes will be applied\n" : "Resetting pool for production…\n");
  console.log(`Test users to delete: ${testUsers.length}`);
  for (const u of testUsers) console.log(`  - ${u.email}`);
  console.log(`Accounts to keep: ${keepUsers.length}`);
  for (const u of keepUsers) console.log(`  - ${u.email ?? u.id}`);

  if (dryRun) {
    const tables = [
      "prediction_changes",
      "prediction_admin_overrides",
      "user_jornada_bonus_points",
      "jornada_results",
      "user_match_points",
      "matchday_bonuses",
      "admin_actions",
      "bug_reports",
      "predictions",
      "bracket_picks",
      "user_tournament_submissions",
    ];
    for (const table of tables) {
      const { count, error } = await admin
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) console.log(`  ${table}: ? (${error.message})`);
      else console.log(`  ${table}: ${count ?? 0} rows`);
    }
    const { count: finished } = await admin
      .from("matches")
      .select("*", { count: "exact", head: true })
      .neq("status", "scheduled");
    console.log(`  matches not scheduled: ${finished ?? 0}`);
    return;
  }

  const steps: [string, () => Promise<number>][] = [
    ["prediction_changes", () => deleteAllRows(admin, "prediction_changes")],
    [
      "prediction_admin_overrides",
      () => deleteAllRows(admin, "prediction_admin_overrides"),
    ],
    [
      "user_jornada_bonus_points",
      () =>
        deleteAllRows(admin, "user_jornada_bonus_points", {
          column: "id",
          op: "gte_zero",
        }),
    ],
    [
      "jornada_results",
      () =>
        deleteAllRows(admin, "jornada_results", {
          column: "jornada_key",
          op: "not_null",
        }),
    ],
    [
      "user_match_points",
      () =>
        deleteAllRows(admin, "user_match_points", {
          column: "id",
          op: "gte_zero",
        }),
    ],
    ["matchday_bonuses", () => deleteAllRows(admin, "matchday_bonuses")],
    [
      "admin_actions",
      () =>
        deleteAllRows(admin, "admin_actions", {
          column: "id",
          op: "gte_zero",
        }),
    ],
    ["bug_reports", () => deleteAllRows(admin, "bug_reports")],
    ["predictions", () => deleteAllRows(admin, "predictions")],
    ["bracket_picks", () => deleteAllRows(admin, "bracket_picks")],
    [
      "user_tournament_submissions",
      () => deleteAllRows(admin, "user_tournament_submissions"),
    ],
  ];

  for (const [name, fn] of steps) {
    const n = await fn();
    console.log(`Cleared ${name}: ${n} rows`);
  }

  const { data: resetMatches, error: matchErr } = await admin
    .from("matches")
    .update({
      home_score: null,
      away_score: null,
      result_advances_team_id: null,
      status: "scheduled",
      updated_at: new Date().toISOString(),
    })
    .or("home_score.not.is.null,away_score.not.is.null,status.neq.scheduled,result_advances_team_id.not.is.null")
    .select("id");

  if (matchErr) throw new Error(`matches reset: ${matchErr.message}`);
  console.log(`Reset match results: ${resetMatches?.length ?? 0} matches`);

  const now = new Date().toISOString();
  const { data: resetProfiles, error: profileErr } = await admin
    .from("profiles")
    .update({
      total_points: 0,
      entry_fee_paid: false,
      withdrawn_at: null,
      withdrawn_by: null,
      updated_at: now,
    })
    .eq("is_admin", false)
    .select("username, is_admin");

  if (profileErr) throw new Error(`profiles reset: ${profileErr.message}`);

  const { data: resetAdmins, error: adminProfileErr } = await admin
    .from("profiles")
    .update({
      total_points: 0,
      entry_fee_paid: true,
      withdrawn_at: null,
      withdrawn_by: null,
      updated_at: now,
    })
    .eq("is_admin", true)
    .select("username, is_admin");

  if (adminProfileErr) throw new Error(`admin profiles reset: ${adminProfileErr.message}`);

  const allReset = [...(resetProfiles ?? []), ...(resetAdmins ?? [])];
  console.log(
    `Reset profiles: ${allReset.length} (${allReset.map((p) => `@${p.username}${p.is_admin ? " [admin]" : ""}`).join(", ") || "none"})`
  );

  if (testUsers.length > 0) {
    const testIds = testUsers.map((u) => u.id);
    const { error: inviteErr } = await admin
      .from("invitation_codes")
      .update({ redeemed_by: null, redeemed_at: null, uses_count: 0 })
      .in("redeemed_by", testIds);
    if (inviteErr) throw new Error(`invitation_codes: ${inviteErr.message}`);

    for (const u of testUsers) {
      const { error } = await admin.auth.admin.deleteUser(u.id);
      if (error) throw new Error(`deleteUser ${u.email}: ${error.message}`);
      console.log(`Deleted test user ${u.email}`);
    }
  }

  console.log("\nDone. Pool is clean for real players.");
  console.log("Next: mark entry_fee_paid for each real participant from /admin.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
