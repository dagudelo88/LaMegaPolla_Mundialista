import {
  configBooleanFromMap,
  configNumberFromMap,
  configStringFromMap,
} from "@/lib/config/get-config";
import { calculatePoolPayouts, type PoolPayouts } from "@/lib/pool/calculate-pool";
import { loadLeaderboard, type RankedLeaderboardRow } from "@/lib/pool/load-leaderboard";
import { createClient } from "@/lib/supabase/server";

export type LeaderboardRow = RankedLeaderboardRow;

export interface HomeDashboardData {
  leaderboard: LeaderboardRow[];
  pool: PoolPayouts;
  playerLinksEnabled: boolean;
}

const DEFAULT_POOL_ENTRY_FEE = 100_000;

async function loadPoolConfigMap(): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_config")
    .select("key, value")
    .like("key", "pool.%");

  if (error) throw new Error(error.message);

  const out: Record<string, unknown> = {};
  for (const row of data ?? []) {
    out[row.key] = row.value;
  }
  return out;
}

export async function loadHomeDashboardData(): Promise<HomeDashboardData> {
  const [leaderboard, poolConfig] = await Promise.all([
    loadLeaderboard(),
    loadPoolConfigMap(),
  ]);

  const playerLinksEnabled = configBooleanFromMap(
    poolConfig,
    "pool.public_predictions_enabled",
    false
  );

  const pool = calculatePoolPayouts(
    leaderboard.length,
    configNumberFromMap(poolConfig, "pool.entry_fee", DEFAULT_POOL_ENTRY_FEE),
    configStringFromMap(poolConfig, "pool.currency", "COP"),
    {
      first: configNumberFromMap(poolConfig, "pool.first_place_pct", 70),
      second: configNumberFromMap(poolConfig, "pool.second_place_pct", 15),
      third: configNumberFromMap(poolConfig, "pool.third_place_pct", 10),
      admin: configNumberFromMap(poolConfig, "pool.admin_pct", 5),
    }
  );

  return { leaderboard, pool, playerLinksEnabled };
}
