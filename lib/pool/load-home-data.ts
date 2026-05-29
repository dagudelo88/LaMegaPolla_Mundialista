import { getConfig, getConfigNumber } from "@/lib/config/get-config";
import { calculatePoolPayouts, type PoolPayouts } from "@/lib/pool/calculate-pool";
import { createClient } from "@/lib/supabase/server";

export interface LeaderboardRow {
  username: string;
  total_points: number;
  joined_at: string;
}

export interface HomeDashboardData {
  leaderboard: LeaderboardRow[];
  pool: PoolPayouts;
}

export async function loadHomeDashboardData(): Promise<HomeDashboardData> {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("profiles")
    .select("username, total_points, joined_at")
    .not("username", "is", null)
    .not("invite_redeemed_at", "is", null)
    .order("total_points", { ascending: false })
    .order("joined_at", { ascending: true });

  const leaderboard = (rows ?? []).filter(
    (r): r is LeaderboardRow => r.username != null
  );

  const [
    entryFee,
    firstPct,
    secondPct,
    thirdPct,
    adminPct,
    currencyRaw,
  ] = await Promise.all([
    getConfigNumber("pool.entry_fee", 0),
    getConfigNumber("pool.first_place_pct", 70),
    getConfigNumber("pool.second_place_pct", 15),
    getConfigNumber("pool.third_place_pct", 10),
    getConfigNumber("pool.admin_pct", 5),
    getConfig<string>("pool.currency"),
  ]);

  const currency =
    typeof currencyRaw === "string"
      ? currencyRaw.replace(/^"|"$/g, "")
      : "COP";

  const pool = calculatePoolPayouts(
    leaderboard.length,
    entryFee,
    currency,
    {
      first: firstPct,
      second: secondPct,
      third: thirdPct,
      admin: adminPct,
    }
  );

  return { leaderboard, pool };
}
