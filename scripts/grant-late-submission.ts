import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { colombiaTodayAt11Iso } from "./colombia-today-11am-iso";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1]!.trim()] = m[2]!.trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* ignore */
  }
}

async function main() {
  loadEnv();
  const username = process.argv[2];
  const untilArg = process.argv[3];

  if (!username) {
    console.error("Usage: npx tsx scripts/grant-late-submission.ts <username> [untilIso]");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, key);

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, username")
    .ilike("username", username)
    .maybeSingle();

  if (profileErr) {
    console.error(profileErr.message);
    process.exit(1);
  }
  if (!profile) {
    console.error(`User @${username} not found`);
    process.exit(1);
  }

  const until =
    untilArg === "today-11am-co"
      ? colombiaTodayAt11Iso()
      : (untilArg ?? "2026-06-19T04:59:59.000Z"); /* 18 jun 2026, 23:59 hora Colombia */

  const { data: existingConfig } = await admin
    .from("app_config")
    .select("value")
    .eq("key", "late_submission.users")
    .maybeSingle();

  const current =
    existingConfig?.value &&
    typeof existingConfig.value === "object" &&
    !Array.isArray(existingConfig.value)
      ? (existingConfig.value as Record<string, string>)
      : {};

  const next = { ...current, [profile.id]: until };

  const { error: configErr } = await admin.from("app_config").upsert(
    {
      key: "late_submission.users",
      value: next,
      description:
        "Per-user extensions to save/submit predictions after the global deadline.",
    },
    { onConflict: "key" }
  );

  if (configErr) {
    console.error("Config update failed:", configErr.message);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        userId: profile.id,
        username: profile.username,
        late_submission_until: until,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
