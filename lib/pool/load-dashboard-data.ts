import { loadHomeDashboardData } from "@/lib/pool/load-home-data";
import { getLeaderboardRank } from "@/lib/pool/load-leaderboard";
import { createClient } from "@/lib/supabase/server";

export interface UserMatchPointRow {
  matchNumber: number;
  phase: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamCode: string;
  awayTeamCode: string;
  predictedHome: number;
  predictedAway: number;
  actualHome: number;
  actualAway: number;
  points: number;
}

export interface DashboardData {
  leaderboard: Awaited<ReturnType<typeof loadHomeDashboardData>>["leaderboard"];
  pool: Awaited<ReturnType<typeof loadHomeDashboardData>>["pool"];
  rank: number | null;
  matchPoints: UserMatchPointRow[];
  earnedTotal: number;
}

export async function loadDashboardData(
  userId: string,
  username: string | null
): Promise<DashboardData> {
  const supabase = await createClient();
  const { leaderboard, pool } = await loadHomeDashboardData();
  const rank = getLeaderboardRank(leaderboard, username);

  const { data: umpRows } = await supabase
    .from("user_match_points")
    .select("match_id, points")
    .eq("user_id", userId);

  if (!umpRows?.length) {
    return {
      leaderboard,
      pool,
      rank,
      matchPoints: [],
      earnedTotal: 0,
    };
  }

  const matchIds = umpRows.map((r) => r.match_id);
  const pointsByMatch = new Map(umpRows.map((r) => [r.match_id, r.points]));

  const [{ data: matches }, { data: predictions }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, fifa_match_number, phase, home_score, away_score, home_team_id, away_team_id"
      )
      .in("id", matchIds),
    supabase
      .from("predictions")
      .select("match_id, predicted_home, predicted_away")
      .eq("user_id", userId)
      .in("match_id", matchIds),
  ]);

  const teamIds = [
    ...new Set(
      (matches ?? []).flatMap((m) => [m.home_team_id, m.away_team_id].filter(Boolean))
    ),
  ] as number[];

  const { data: teams } = teamIds.length
    ? await supabase.from("teams").select("id, name_es, fifa_code").in("id", teamIds)
    : { data: [] as Array<{ id: number; name_es: string; fifa_code: string }> };

  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));

  const predByMatch = new Map(
    (predictions ?? []).map((p) => [p.match_id, p])
  );

  const matchPoints: UserMatchPointRow[] = (matches ?? [])
    .map((m) => {
      const pred = predByMatch.get(m.id);
      const homeTeam = m.home_team_id ? teamById.get(m.home_team_id) : undefined;
      const awayTeam = m.away_team_id ? teamById.get(m.away_team_id) : undefined;
      if (
        pred == null ||
        m.home_score == null ||
        m.away_score == null ||
        m.fifa_match_number == null ||
        !homeTeam ||
        !awayTeam
      ) {
        return null;
      }
      return {
        matchNumber: m.fifa_match_number,
        phase: m.phase,
        homeTeamName: homeTeam.name_es,
        awayTeamName: awayTeam.name_es,
        homeTeamCode: homeTeam.fifa_code,
        awayTeamCode: awayTeam.fifa_code,
        predictedHome: pred.predicted_home,
        predictedAway: pred.predicted_away,
        actualHome: m.home_score,
        actualAway: m.away_score,
        points: pointsByMatch.get(m.id) ?? 0,
      };
    })
    .filter((row): row is UserMatchPointRow => row != null)
    .sort((a, b) => a.matchNumber - b.matchNumber);

  const earnedTotal = matchPoints.reduce((sum, row) => sum + row.points, 0);

  return {
    leaderboard,
    pool,
    rank,
    matchPoints,
    earnedTotal,
  };
}
