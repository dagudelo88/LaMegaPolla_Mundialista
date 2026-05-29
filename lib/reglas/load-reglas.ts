import { readFile } from "node:fs/promises";
import path from "node:path";

export async function loadReglasMarkdown(): Promise<string> {
  const filePath = path.join(process.cwd(), "REGLAS.md");
  return readFile(filePath, "utf8");
}
