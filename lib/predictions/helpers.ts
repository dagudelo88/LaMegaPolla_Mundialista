import { computeAllGroupStandings } from "@/lib/bracket/group-standings";
import { computeAdvancingThirdGroups } from "@/lib/bracket/third-place-advancement";
import type { GroupMatchResult, KnockoutPredictionScores } from "@/lib/bracket/types";

export interface DbMatchWithTeams {
  id: string;
  fifa_match_number: number | null;
  phase: string;
  group_letter: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_source: unknown;
  away_source: unknown;
  kickoff_at: string;
  prediction_deadline: string;
  status: string;
  home_team?: { id: number; fifa_code: string; name_es: string; flag_emoji: string | null } | null;
  away_team?: { id: number; fifa_code: string; name_es: string; flag_emoji: string | null } | null;
}

export interface PredictionInput {
  match_id: string;
  predicted_home: number;
  predicted_away: number;
  predicted_advances_team_id?: number | null;
}

export interface DbPrediction extends PredictionInput {
  id: string;
  predicted_is_draw: boolean;
  predicted_advances_team_id: number | null;
  locked: boolean;
}

export function buildGroupResultsFromPredictions(
  matches: DbMatchWithTeams[],
  predictions: DbPrediction[]
): GroupMatchResult[] {
  const predByMatch = new Map(predictions.map((p) => [p.match_id, p]));
  const results: GroupMatchResult[] = [];

  for (const m of matches) {
    if (m.phase !== "group_stage" || !m.home_team_id || !m.away_team_id) continue;
    const pred = predByMatch.get(m.id);
    if (!pred) continue;
    results.push({
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      homeGoals: pred.predicted_home,
      awayGoals: pred.predicted_away,
    });
  }

  return results;
}

export function countProgress(
  groupMatchIds: string[],
  knockoutMatchIds: string[],
  predictions: DbPrediction[]
) {
  const predMatchIds = new Set(predictions.map((p) => p.match_id));
  const groupDone = groupMatchIds.filter((id) => predMatchIds.has(id)).length;
  const knockoutDone = knockoutMatchIds.filter((id) => predMatchIds.has(id)).length;
  const groupComplete = groupDone >= groupMatchIds.length && groupMatchIds.length > 0;
  return {
    groupDone,
    groupTotal: groupMatchIds.length,
    knockoutDone,
    knockoutTotal: knockoutMatchIds.length,
    thirdPlaceDone: groupComplete ? 8 : 0,
    thirdPlaceTotal: 8,
  };
}

export function buildKnockoutPredictionsMap(
  matches: { id: string; fifa_match_number: number | null; phase: string }[],
  predictions: PredictionInput[]
): Map<number, KnockoutPredictionScores> {
  const predByMatch = new Map(predictions.map((p) => [p.match_id, p]));
  const map = new Map<number, KnockoutPredictionScores>();

  for (const match of matches) {
    if (match.phase === "group_stage" || !match.fifa_match_number) continue;
    const pred = predByMatch.get(match.id);
    if (!pred) continue;
    map.set(match.fifa_match_number, {
      predictedHome: pred.predicted_home,
      predictedAway: pred.predicted_away,
      predictedAdvancesTeamId: pred.predicted_advances_team_id ?? null,
    });
  }

  return map;
}

export interface PredictionSummaryStats {
  matchesPredicted: number;
  totalGoals: number;
  draws: number;
  homeWins: number;
  awayWins: number;
  avgGoalsPerMatch: number;
  groupGoals: number;
  knockoutGoals: number;
  groupDraws: number;
  knockoutDraws: number;
}

export function computePredictionSummary(
  matches: { id: string; phase: string }[],
  predictions: PredictionInput[]
): PredictionSummaryStats {
  const matchById = new Map(matches.map((m) => [m.id, m]));
  let totalGoals = 0;
  let draws = 0;
  let homeWins = 0;
  let awayWins = 0;
  let groupGoals = 0;
  let knockoutGoals = 0;
  let groupDraws = 0;
  let knockoutDraws = 0;
  let count = 0;

  for (const prediction of predictions) {
    const match = matchById.get(prediction.match_id);
    if (!match) continue;

    const home = prediction.predicted_home;
    const away = prediction.predicted_away;
    const goals = home + away;
    const isGroup = match.phase === "group_stage";

    totalGoals += goals;
    count += 1;
    if (isGroup) groupGoals += goals;
    else knockoutGoals += goals;

    if (home === away) {
      draws += 1;
      if (isGroup) groupDraws += 1;
      else knockoutDraws += 1;
    } else if (home > away) {
      homeWins += 1;
    } else {
      awayWins += 1;
    }
  }

  return {
    matchesPredicted: count,
    totalGoals,
    draws,
    homeWins,
    awayWins,
    avgGoalsPerMatch: count > 0 ? totalGoals / count : 0,
    groupGoals,
    knockoutGoals,
    groupDraws,
    knockoutDraws,
  };
}

export function resolveAdvancingThirdGroups(
  teams: { id: number; fifa_code: string; group_letter: string }[],
  groupResults: GroupMatchResult[],
  groupMatchIds: string[],
  predictions: DbPrediction[]
): string[] {
  const predMatchIds = new Set(predictions.map((p) => p.match_id));
  const groupComplete =
    groupMatchIds.every((id) => predMatchIds.has(id)) && groupMatchIds.length > 0;
  if (!groupComplete) return [];

  const teamRefs = teams.map((t) => ({
    id: t.id,
    fifaCode: t.fifa_code,
    groupLetter: t.group_letter,
  }));
  const standings = computeAllGroupStandings(teamRefs, groupResults);
  return computeAdvancingThirdGroups(standings);
}
