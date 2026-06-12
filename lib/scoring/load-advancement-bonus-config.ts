import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_ADVANCEMENT_BONUS_PER_TEAM } from "@/lib/scoring/calculate-match-advancement-bonus";

export async function loadAdvancementBonusPerTeam(admin: SupabaseClient): Promise<number> {
  const { data } = await admin
    .from("app_config")
    .select("value")
    .eq("key", "scoring.advancement_bonus_per_team")
    .maybeSingle();

  if (!data?.value) return DEFAULT_ADVANCEMENT_BONUS_PER_TEAM;
  const raw = data.value as number | string;
  if (typeof raw === "number") return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : DEFAULT_ADVANCEMENT_BONUS_PER_TEAM;
}
