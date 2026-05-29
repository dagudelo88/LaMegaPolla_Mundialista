import type { SupabaseClient } from "@supabase/supabase-js";
import { getConfigNumber } from "@/lib/config/get-config";
import {
  DEFAULT_SCORING_CONFIG,
  type ScoringConfig,
} from "@/lib/scoring/calculate-match-points";

async function readConfigNumber(
  supabase: SupabaseClient,
  key: string,
  fallback: number
): Promise<number> {
  const { data } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (!data?.value) return fallback;
  const raw = data.value as number | string;
  if (typeof raw === "number") return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function loadScoringConfig(
  supabase?: SupabaseClient
): Promise<ScoringConfig> {
  if (supabase) {
    const [groupExact, groupWinnerOnly, knockoutExact, knockoutWinnerOnly] =
      await Promise.all([
        readConfigNumber(supabase, "scoring.group.exact", DEFAULT_SCORING_CONFIG.groupExact),
        readConfigNumber(
          supabase,
          "scoring.group.winner_only",
          DEFAULT_SCORING_CONFIG.groupWinnerOnly
        ),
        readConfigNumber(
          supabase,
          "scoring.knockout.exact",
          DEFAULT_SCORING_CONFIG.knockoutExact
        ),
        readConfigNumber(
          supabase,
          "scoring.knockout.winner_only",
          DEFAULT_SCORING_CONFIG.knockoutWinnerOnly
        ),
      ]);
    return { groupExact, groupWinnerOnly, knockoutExact, knockoutWinnerOnly };
  }

  const [groupExact, groupWinnerOnly, knockoutExact, knockoutWinnerOnly] =
    await Promise.all([
      getConfigNumber("scoring.group.exact", DEFAULT_SCORING_CONFIG.groupExact),
      getConfigNumber(
        "scoring.group.winner_only",
        DEFAULT_SCORING_CONFIG.groupWinnerOnly
      ),
      getConfigNumber(
        "scoring.knockout.exact",
        DEFAULT_SCORING_CONFIG.knockoutExact
      ),
      getConfigNumber(
        "scoring.knockout.winner_only",
        DEFAULT_SCORING_CONFIG.knockoutWinnerOnly
      ),
    ]);

  return { groupExact, groupWinnerOnly, knockoutExact, knockoutWinnerOnly };
}
