/**
 * One-time bootstrap: promote a user to admin by email.
 *
 * Usage:
 *   npx tsx scripts/make-first-admin.ts user@example.com
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
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
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/make-first-admin.ts <email>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("listUsers:", listErr.message);
    process.exit(1);
  }

  const user = list.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  if (!user) {
    console.error(`No auth user found for email: ${email}`);
    process.exit(1);
  }

  const { error: upErr } = await supabase
    .from("profiles")
    .upsert(
      { id: user.id, role: "participant", is_admin: true },
      { onConflict: "id" }
    );

  if (upErr) {
    console.error("profiles update:", upErr.message);
    process.exit(1);
  }

  console.log(`OK: ${email} (${user.id}) is now admin.`);
}

main();
