import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface LeaderboardRow {
  username: string;
  total_points: number;
  plenos_count: number;
  joined_at: string;
}

export interface RankedLeaderboardRow extends LeaderboardRow {
  rank: number;
}

export interface PodiumTieGroup {
  rank: 1 | 2 | 3;
  usernames: string[];
  totalPrize: number;
  suggestedPerPerson: number;
}

export interface PodiumPrizeAmounts {
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
}

const PRIZE_BY_RANK: Record<1 | 2 | 3, keyof PodiumPrizeAmounts> = {
  1: "firstPlace",
  2: "secondPlace",
  3: "thirdPlace",
};

/** REGLAS §8 — row order (not displayed rank). */
export function sortLeaderboard(rows: LeaderboardRow[]): LeaderboardRow[] {
  return [...rows].sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    if (b.plenos_count !== a.plenos_count) return b.plenos_count - a.plenos_count;
    return a.joined_at.localeCompare(b.joined_at);
  });
}

/** Competition ranking by total_points only (1, 1, 3…). */
export function assignCompetitionRanks(rows: LeaderboardRow[]): RankedLeaderboardRow[] {
  const sorted = sortLeaderboard(rows);
  let rank = 1;

  return sorted.map((row, index) => {
    if (index > 0 && row.total_points !== sorted[index - 1]!.total_points) {
      rank = index + 1;
    }
    return { ...row, rank };
  });
}

export function getLeaderboardRank(
  rows: RankedLeaderboardRow[],
  username: string | null
): number | null {
  if (username == null) return null;
  const row = rows.find((r) => r.username === username);
  return row?.rank ?? null;
}

export function getPodiumTies(
  rows: RankedLeaderboardRow[],
  prizes: PodiumPrizeAmounts
): PodiumTieGroup[] {
  const ties: PodiumTieGroup[] = [];

  for (const podiumRank of [1, 2, 3] as const) {
    const group = rows.filter((r) => r.rank === podiumRank);
    if (group.length <= 1) continue;

    const totalPrize = prizes[PRIZE_BY_RANK[podiumRank]];
    ties.push({
      rank: podiumRank,
      usernames: group.map((r) => r.username),
      totalPrize,
      suggestedPerPerson: totalPrize / group.length,
    });
  }

  return ties;
}

export async function fetchLeaderboardRows(
  supabase: SupabaseClient
): Promise<LeaderboardRow[]> {
  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("id, username, total_points, joined_at")
    .not("username", "is", null)
    .not("invite_redeemed_at", "is", null);

  if (profilesErr) throw new Error(profilesErr.message);

  const active = (profiles ?? []).filter(
    (p): p is typeof p & { username: string; joined_at: string } =>
      p.username != null && p.joined_at != null
  );

  if (active.length === 0) return [];

  const profileIds = active.map((p) => p.id);

  const { data: plenoRows, error: plenosErr } = await supabase
    .from("user_match_points")
    .select("user_id, points")
    .in("user_id", profileIds)
    .in("points", [10, 20]);

  if (plenosErr) throw new Error(plenosErr.message);

  const plenosByUser = new Map<string, number>();
  for (const row of plenoRows ?? []) {
    plenosByUser.set(row.user_id, (plenosByUser.get(row.user_id) ?? 0) + 1);
  }

  return active.map((p) => ({
    username: p.username,
    total_points: p.total_points,
    plenos_count: plenosByUser.get(p.id) ?? 0,
    joined_at: p.joined_at,
  }));
}

export async function loadLeaderboard(): Promise<RankedLeaderboardRow[]> {
  const supabase = await createClient();
  const rows = await fetchLeaderboardRows(supabase);
  return assignCompetitionRanks(rows);
}
