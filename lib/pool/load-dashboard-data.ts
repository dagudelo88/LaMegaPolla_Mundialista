import {
  collectJornadaKeysFromMatches,
  computeJornadaBonusByMatchId,
} from "@/lib/jornada/compute-user-jornada-bonus";
import { getJornadaKey } from "@/lib/jornada/helpers";
import { loadHomeDashboardData } from "@/lib/pool/load-home-data";
import { getLeaderboardRank } from "@/lib/pool/load-leaderboard";
import { DEFAULT_JORNADA_BONUS_CONFIG } from "@/lib/scoring/calculate-jornada-bonus";
import {
  calculateMatchPoints,
  type MatchPhase,
} from "@/lib/scoring/calculate-match-points";
import { loadScoringConfig } from "@/lib/scoring/load-scoring-config";
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
  matchPoints: number;
  jornadaBonusPoints: number;
  points: number;
  isJornadaTopScorerPick: boolean;
  jornadaTopScorerGoals: number | null;
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
  netTotal: number;
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
      netTotal: -totalPointsSpent,
      paidChanges,
      totalPointsSpent,
    };
  }

  const matchIds = umpRows.map((r) => r.match_id);

  const [{ data: scoredMatches }, { data: allPredictions }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, fifa_match_number, phase, kickoff_at, home_score, away_score, home_team_id, away_team_id"
      )
      .in("id", matchIds),
    supabase
      .from("predictions")
      .select("match_id, predicted_home, predicted_away")
      .eq("user_id", userId),
  ]);

  const jornadaKeys = collectJornadaKeysFromMatches(scoredMatches ?? []);

  const { data: jornadaMatchesRaw } = jornadaKeys.length
    ? await supabase
        .from("matches")
        .select(
          "id, fifa_match_number, kickoff_at, status, home_score, away_score"
        )
    : { data: [] };

  const jornadaMatches = (jornadaMatchesRaw ?? []).filter((m) =>
    jornadaKeys.includes(getJornadaKey(m.kickoff_at))
  );

  const { data: jornadaResults, error: jornadaResultsErr } = jornadaKeys.length
    ? await supabase
        .from("jornada_results")
        .select("jornada_key, max_total_goals, winning_match_ids, is_tie")
        .in("jornada_key", jornadaKeys)
    : { data: [], error: null };

  if (jornadaResultsErr) {
    console.warn("jornada_results unavailable:", jornadaResultsErr.message);
  }

  const [scoringConfig, { data: jornadaBonusConfigRows }] = await Promise.all([
    loadScoringConfig(supabase),
    supabase
      .from("app_config")
      .select("key, value")
      .in("key", ["scoring.jornada_bonus.match", "scoring.jornada_bonus.exact"]),
  ]);

  const jornadaConfigByKey = new Map(
    (jornadaBonusConfigRows ?? []).map((r) => [r.key, r.value])
  );
  const readBonusConfig = (key: string, fallback: number) => {
    const raw = jornadaConfigByKey.get(key);
    if (raw == null) return fallback;
    if (typeof raw === "number") return raw;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };

  const jornadaBonusByMatch = computeJornadaBonusByMatchId({
    matches: jornadaMatches,
    predictions: allPredictions ?? [],
    jornadaResults: jornadaResults ?? [],
    config: {
      match: readBonusConfig(
        "scoring.jornada_bonus.match",
        DEFAULT_JORNADA_BONUS_CONFIG.match
      ),
      exact: readBonusConfig(
        "scoring.jornada_bonus.exact",
        DEFAULT_JORNADA_BONUS_CONFIG.exact
      ),
    },
  });

  const predictions = (allPredictions ?? []).filter((p) => matchIds.includes(p.match_id));

  const teamIds = [
    ...new Set(
      (scoredMatches ?? []).flatMap((m) => [m.home_team_id, m.away_team_id].filter(Boolean))
    ),
  ] as number[];

  const { data: teams } = teamIds.length
    ? await supabase.from("teams").select("id, name_es, fifa_code").in("id", teamIds)
    : { data: [] as Array<{ id: number; name_es: string; fifa_code: string }> };

  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));

  const predByMatch = new Map(predictions.map((p) => [p.match_id, p]));

  const matchPoints: UserMatchPointRow[] = (scoredMatches ?? [])
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
      const baseMatchPoints = calculateMatchPoints(
        m.phase as MatchPhase,
        { home: m.home_score, away: m.away_score },
        { home: pred.predicted_home, away: pred.predicted_away },
        scoringConfig
      );
      const jornadaInfo = jornadaBonusByMatch.get(m.id);
      const jornadaBonusPoints = jornadaInfo?.bonus ?? 0;
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
        matchPoints: baseMatchPoints,
        jornadaBonusPoints,
        points: baseMatchPoints + jornadaBonusPoints,
        isJornadaTopScorerPick: jornadaInfo?.isTopScorerPick ?? false,
        jornadaTopScorerGoals: jornadaInfo?.predictedTotalGoals ?? null,
      };
    })
    .filter((row): row is UserMatchPointRow => row != null)
    .sort((a, b) => a.matchNumber - b.matchNumber);

  const earnedTotal = matchPoints.reduce((sum, row) => sum + row.points, 0);
  const netTotal = earnedTotal - totalPointsSpent;

  return {
    rank,
    matchPoints,
    earnedTotal,
    netTotal,
    paidChanges,
    totalPointsSpent,
  };
}
