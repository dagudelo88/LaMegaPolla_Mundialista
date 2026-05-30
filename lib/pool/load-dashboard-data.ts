import { loadHomeDashboardData } from "@/lib/pool/load-home-data";
import { getLeaderboardRank } from "@/lib/pool/load-leaderboard";
import { createClient } from "@/lib/supabase/server";
import { PHASE_LABELS } from "@/types/database";

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

export interface PaidChangeRow {
  id: string;
  createdAt: string;
  matchNumber: number | null;
  matchLabel: string;
  beforeScore: string;
  afterScore: string;
  pointsSpent: number;
}

export interface DashboardData {
  rank: number | null;
  matchPoints: UserMatchPointRow[];
  earnedTotal: number;
  paidChanges: PaidChangeRow[];
  totalPointsSpent: number;
}

function formatScore(home: number | null | undefined, away: number | null | undefined): string {
  if (home == null || away == null) return "—";
  return `${home}-${away}`;
}

function buildMatchLabel(
  matchNumber: number | null,
  homeName: string | null,
  awayName: string | null,
  phase: string | null,
  groupLetter: string | null
): string {
  const teams =
    homeName && awayName ? `${homeName} vs ${awayName}` : "Partido por definir";
  const phaseLabel =
    phase === "group_stage" && groupLetter
      ? `Grupo ${groupLetter}`
      : phase
        ? PHASE_LABELS[phase as keyof typeof PHASE_LABELS] ?? phase
        : "";
  const num = matchNumber != null ? `#${matchNumber}` : "";
  return [num, teams, phaseLabel].filter(Boolean).join(" · ");
}

async function loadPaidChanges(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ paidChanges: PaidChangeRow[]; totalPointsSpent: number }> {
  const { data: rows } = await supabase
    .from("prediction_changes")
    .select(
      "id, match_id, old_home, old_away, new_home, new_away, points_spent, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!rows?.length) {
    return { paidChanges: [], totalPointsSpent: 0 };
  }

  const matchIds = [...new Set(rows.map((r) => r.match_id).filter(Boolean))] as string[];

  const { data: matches } = matchIds.length
    ? await supabase
        .from("matches")
        .select("id, fifa_match_number, phase, group_letter, home_team_id, away_team_id")
        .in("id", matchIds)
    : { data: [] };

  const teamIds = [
    ...new Set(
      (matches ?? []).flatMap((m) => [m.home_team_id, m.away_team_id].filter(Boolean))
    ),
  ] as number[];

  const { data: teams } = teamIds.length
    ? await supabase.from("teams").select("id, name_es").in("id", teamIds)
    : { data: [] as Array<{ id: number; name_es: string }> };

  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name_es]));
  const matchById = new Map(
    (matches ?? []).map((m) => [
      m.id,
      {
        matchNumber: m.fifa_match_number,
        phase: m.phase,
        groupLetter: m.group_letter,
        homeName: m.home_team_id ? teamNameById.get(m.home_team_id) ?? null : null,
        awayName: m.away_team_id ? teamNameById.get(m.away_team_id) ?? null : null,
      },
    ])
  );

  const paidChanges: PaidChangeRow[] = rows.map((row) => {
    const matchMeta = row.match_id ? matchById.get(row.match_id) : null;
    return {
      id: row.id,
      createdAt: row.created_at,
      matchNumber: matchMeta?.matchNumber ?? null,
      matchLabel: matchMeta
        ? buildMatchLabel(
            matchMeta.matchNumber,
            matchMeta.homeName,
            matchMeta.awayName,
            matchMeta.phase,
            matchMeta.groupLetter
          )
        : "Partido",
      beforeScore: formatScore(row.old_home, row.old_away),
      afterScore: formatScore(row.new_home, row.new_away),
      pointsSpent: row.points_spent,
    };
  });

  const totalPointsSpent = paidChanges.reduce((sum, row) => sum + row.pointsSpent, 0);

  return { paidChanges, totalPointsSpent };
}

export async function loadDashboardData(
  userId: string,
  username: string | null
): Promise<DashboardData> {
  const supabase = await createClient();
  const { leaderboard } = await loadHomeDashboardData();
  const rank = getLeaderboardRank(leaderboard, username);
  const { paidChanges, totalPointsSpent } = await loadPaidChanges(supabase, userId);

  const { data: umpRows } = await supabase
    .from("user_match_points")
    .select("match_id, points")
    .eq("user_id", userId);

  if (!umpRows?.length) {
    return {
      rank,
      matchPoints: [],
      earnedTotal: 0,
      paidChanges,
      totalPointsSpent,
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
    rank,
    matchPoints,
    earnedTotal,
    paidChanges,
    totalPointsSpent,
  };
}
