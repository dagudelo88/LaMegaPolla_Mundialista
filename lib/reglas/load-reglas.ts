import { readFile } from "node:fs/promises";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";

async function readReglasFile(): Promise<string> {
  const filePath = path.join(process.cwd(), "REGLAS.md");
  return readFile(filePath, "utf8");
}

export const loadReglasMarkdown = unstable_cache(
  readReglasFile,
  ["reglas-markdown"],
  { revalidate: 3600, tags: [CACHE_TAGS.reglas] }
);
