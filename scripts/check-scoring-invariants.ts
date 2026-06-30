/**
 * Enforce scoring architecture: single writer for user_match_points.
 *
 * Usage: npm run check:scoring
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const ALLOWED_UPSERT = "lib/scoring/persist-user-match-points.ts";

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) files.push(full);
  }
  return files;
}

function main() {
  const violations: string[] = [];

  for (const file of walk(ROOT)) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    if (rel === ALLOWED_UPSERT) continue;
    if (rel.includes(".test.") || rel.startsWith("scripts/check-scoring-invariants")) continue;

    const content = readFileSync(file, "utf8");
    if (content.includes('from("user_match_points").upsert')) {
      violations.push(`${rel}: direct upsert to user_match_points`);
    }
    if (
      rel === "lib/pool/load-dashboard-data.ts" &&
      content.includes("calculateMatchPoints(")
    ) {
      violations.push(`${rel}: must not compute final match points with calculateMatchPoints`);
    }
  }

  if (violations.length) {
    console.error("Scoring invariant violations:\n");
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }

  console.log("Scoring invariants OK.");
}

main();
