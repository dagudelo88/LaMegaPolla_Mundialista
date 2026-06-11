import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { colombiaTodayAt11Iso } from "../lib/predictions/colombia-datetime";

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
  const untilArg = process.argv[2];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const until =
    untilArg === "today-11am-co" || !untilArg
      ? colombiaTodayAt11Iso()
      : untilArg;

  const admin = createClient(url, key);
  const { error } = await admin.from("app_config").upsert(
    {
      key: "late_submission.registrations_until",
      value: until,
      description:
        "New registrations without a submitted poll may save/submit until this instant (ISO UTC).",
    },
    { onConflict: "key" }
  );

  if (error) {
    console.error("Config update failed:", error.message);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        key: "late_submission.registrations_until",
        until,
        colombiaLabel: "Hoy 11:00 a.m. hora Colombia (si usaste today-11am-co)",
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
