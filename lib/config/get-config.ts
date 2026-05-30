import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createPublicSupabase } from "@/lib/supabase/public";

const loadAppConfigMap = unstable_cache(
  async (): Promise<Record<string, unknown>> => {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase.from("app_config").select("key, value");
    if (error) throw new Error(error.message);

    const out: Record<string, unknown> = {};
    for (const row of data ?? []) {
      out[row.key] = row.value;
    }
    return out;
  },
  ["app-config-map-v2"],
  { revalidate: 300, tags: [CACHE_TAGS.appConfig] }
);

export function configNumberFromMap(
  map: Record<string, unknown>,
  key: string,
  fallback: number
): number {
  const raw = map[key];
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw === "number") return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function configBooleanFromMap(
  map: Record<string, unknown>,
  key: string,
  fallback: boolean
): boolean {
  const raw = map[key];
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw === "boolean") return raw;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return fallback;
}

export function configStringFromMap(
  map: Record<string, unknown>,
  key: string,
  fallback: string
): string {
  const raw = map[key];
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw === "string") return raw.replace(/^"|"$/g, "");
  return String(raw);
}

export async function getConfig<T = unknown>(key: string): Promise<T | null> {
  const all = await loadAppConfigMap();
  return (all[key] as T | undefined) ?? null;
}

export async function getConfigNumber(key: string, fallback: number): Promise<number> {
  const all = await loadAppConfigMap();
  return configNumberFromMap(all, key, fallback);
}

export async function getConfigBoolean(key: string, fallback: boolean): Promise<boolean> {
  const all = await loadAppConfigMap();
  return configBooleanFromMap(all, key, fallback);
}

export async function getAllConfig(): Promise<Record<string, unknown>> {
  return loadAppConfigMap();
}
