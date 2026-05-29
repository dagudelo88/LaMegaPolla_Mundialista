/**
 * Execute SQL batch files against Supabase via Management API using access token from env.
 * Fallback: prints instructions.
 *
 * Usage with service role (recommended):
 *   set SUPABASE_SERVICE_ROLE_KEY=... && npx tsx scripts/run-sql-batches.ts
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      const key = t.slice(0, i).trim();
      const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* ignore */
  }
}

async function runSqlViaRpc(supabase: ReturnType<typeof createClient>, sql: string) {
  // Use postgres REST: not available. Use individual inserts from seed-fifa-2026.ts instead.
  throw new Error("Direct SQL requires Supabase MCP or SQL editor");
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
    console.error("Paste service_role from Supabase Dashboard → Settings → API");
    process.exit(1);
  }

  // Delegate to existing seed script logic
  const { execSync } = await import("node:child_process");
  execSync("npx tsx scripts/seed-fifa-2026.ts", { stdio: "inherit", env: process.env });
}

main();
