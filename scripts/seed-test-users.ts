/**
 * Create 6 test players with 6 group-stage predictions each (service role).
 *
 * Usage: npm run seed-test-users
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
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

const TEST_PASSWORD = "TestMega2026!";

const TEST_PLAYERS = [
  { email: "test1@megapolla.test", username: "coloso", totalPoints: 62 },
  { email: "test2@megapolla.test", username: "oraculo", totalPoints: 51 },
  { email: "test3@megapolla.test", username: "gambeta", totalPoints: 44 },
  { email: "test4@megapolla.test", username: "tactico", totalPoints: 33 },
  { email: "test5@megapolla.test", username: "suerte", totalPoints: 21 },
  { email: "test6@megapolla.test", username: "rookie", totalPoints: 8 },
] as const;

/** Six varied scorelines for the first six group matches (by FIFA number). */
const SCORELINES = [
  [
    [2, 1],
    [1, 1],
    [3, 0],
    [0, 2],
    [2, 2],
    [1, 0],
  ],
  [
    [1, 0],
    [2, 2],
    [0, 1],
    [3, 1],
    [1, 1],
    [2, 0],
  ],
  [
    [3, 2],
    [0, 0],
    [2, 1],
    [1, 3],
    [4, 1],
    [0, 1],
  ],
  [
    [1, 2],
    [2, 0],
    [1, 1],
    [2, 2],
    [0, 0],
    [3, 1],
  ],
  [
    [0, 1],
    [3, 3],
    [2, 2],
    [1, 0],
    [1, 2],
    [2, 1],
  ],
  [
    [2, 0],
    [0, 2],
    [1, 1],
    [3, 2],
    [2, 3],
    [1, 1],
  ],
] as const;

async function findUserByEmail(
  admin: SupabaseClient,
  email: string
) {
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureUser(
  admin: SupabaseClient,
  email: string
) {
  const existing = await findUserByEmail(admin, email);
  if (existing) return existing.id;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`createUser ${email}: ${error?.message ?? "no user"}`);
  }
  return data.user.id;
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

  const { data: matches, error: matchErr } = await admin
    .from("matches")
    .select("id, fifa_match_number, home_team_id, away_team_id")
    .eq("phase", "group_stage")
    .order("fifa_match_number")
    .limit(6);

  if (matchErr) {
    console.error("matches:", matchErr.message);
    process.exit(1);
  }
  if (!matches?.length) {
    console.error("No group matches found. Run npm run seed-fifa first.");
    process.exit(1);
  }

  console.log(`Using ${matches.length} group matches (FIFA #${matches.map((m) => m.fifa_match_number).join(", #")})`);

  const now = new Date().toISOString();

  for (let i = 0; i < TEST_PLAYERS.length; i++) {
    const player = TEST_PLAYERS[i]!;
    const scores = SCORELINES[i]!;

    const userId = await ensureUser(admin, player.email);

    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        id: userId,
        role: "participant",
        is_admin: false,
        username: player.username,
        invite_redeemed_at: now,
        total_points: 0,
        updated_at: now,
      },
      { onConflict: "id" }
    );
    if (profileErr) {
      console.error(`profile ${player.username}:`, profileErr.message);
      process.exit(1);
    }

    const predictions = matches.map((match, idx) => {
      const [home, away] = scores[idx] ?? [1, 1];
      return {
        user_id: userId,
        match_id: match.id,
        predicted_home: home,
        predicted_away: away,
        predicted_is_draw: home === away,
        predicted_advances_team_id: null,
        locked: true,
        updated_at: now,
      };
    });

    const { error: predErr } = await admin
      .from("predictions")
      .upsert(predictions, { onConflict: "user_id,match_id" });

    if (predErr) {
      console.error(`predictions ${player.username}:`, predErr.message);
      process.exit(1);
    }

    const { error: subErr } = await admin.from("user_tournament_submissions").upsert(
      {
        user_id: userId,
        is_complete: true,
        submitted_at: now,
      },
      { onConflict: "user_id" }
    );

    if (subErr) {
      console.error(`submission ${player.username}:`, subErr.message);
      process.exit(1);
    }

    console.log(`OK @${player.username} — 6 pronósticos bloqueados`);
  }

  console.log("\n--- Credenciales de prueba ---");
  console.log(`Contraseña (todos): ${TEST_PASSWORD}`);
  for (const p of TEST_PLAYERS) {
    console.log(`  ${p.email} → @${p.username}`);
  }
  console.log("\nInicia sesión en /login y revisa / (home) o /leaderboard.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
