/**
 * Audit stored scores vs expected values for all active submitted participants.
 *
 * Usage: npm run audit-scores
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { auditScores, formatAuditReport } from "@/lib/scoring/audit-scores";

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

  const result = await auditScores(admin);
  console.log(formatAuditReport(result));

  const hasIssues =
    result.matchDiscrepancies.length > 0 ||
    result.advancementDiscrepancies.length > 0 ||
    result.totalDiscrepancies.length > 0;

  process.exit(hasIssues ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
