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
  ["app-config-map"],
  { revalidate: 300, tags: [CACHE_TAGS.appConfig] }
);

export async function getConfig<T = unknown>(key: string): Promise<T | null> {
  const all = await loadAppConfigMap();
  return (all[key] as T | undefined) ?? null;
}

export async function getConfigNumber(key: string, fallback: number): Promise<number> {
  const raw = await getConfig<number | string>(key);
  if (raw === null) return fallback;
  if (typeof raw === "number") return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function getConfigBoolean(key: string, fallback: boolean): Promise<boolean> {
  const raw = await getConfig<boolean | string>(key);
  if (raw === null) return fallback;
  if (typeof raw === "boolean") return raw;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return fallback;
}

export async function getAllConfig(): Promise<Record<string, unknown>> {
  return loadAppConfigMap();
}
