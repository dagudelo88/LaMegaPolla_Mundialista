import { createClient } from "@/lib/supabase/server";

export async function getConfig<T = unknown>(key: string): Promise<T | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error || !data) return null;
  return data.value as T;
}

export async function getConfigNumber(key: string, fallback: number): Promise<number> {
  const raw = await getConfig<number | string>(key);
  if (raw === null) return fallback;
  if (typeof raw === "number") return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function getAllConfig(): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_config").select("key, value");
  const out: Record<string, unknown> = {};
  for (const row of data ?? []) {
    out[row.key] = row.value;
  }
  return out;
}
