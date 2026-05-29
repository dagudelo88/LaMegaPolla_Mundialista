/**
 * Push FIFA seed SQL to Supabase in batches via stdin chunks.
 * Requires: data/fifa-2026/seed.sql (run: npx tsx scripts/emit-fifa-seed-sql.ts --write)
 * Usage: npx tsx scripts/push-fifa-seed-batches.ts
 * Then paste each batch into Supabase SQL editor OR use with MCP.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sql = readFileSync(resolve(process.cwd(), "data/fifa-2026/seed.sql"), "utf8");
const lines = sql.split("\n").filter((l) => l.trim() && l.trim() !== "BEGIN;" && l.trim() !== "COMMIT;");

const teamLines = lines.filter((l) => l.includes("INSERT INTO public.teams"));
const matchLines = lines.filter((l) => l.includes("INSERT INTO public.matches"));

const batches = [
  ["teams", `BEGIN;\n${teamLines.join("\n")}\nCOMMIT;`],
  ["matches_group_1", `BEGIN;\n${matchLines.slice(0, 36).join("\n")}\nCOMMIT;`],
  ["matches_group_2", `BEGIN;\n${matchLines.slice(36, 72).join("\n")}\nCOMMIT;`],
  ["matches_knockout", `BEGIN;\n${matchLines.slice(72).join("\n")}\nCOMMIT;`],
] as const;

for (const [name, batch] of batches) {
  const path = resolve(process.cwd(), `data/fifa-2026/batch-${name}.sql`);
  require("node:fs").writeFileSync(path, batch, "utf8");
  console.log(`${name}: ${batch.length} chars -> ${path}`);
}
