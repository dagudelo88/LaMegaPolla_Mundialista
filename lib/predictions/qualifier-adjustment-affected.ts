import { resolveAllKnockoutMatches } from "@/lib/bracket/knockout-resolver";
import type {
  GroupMatchResult,
  KnockoutMatchDef,
  KnockoutPredictionScores,
  TeamRef,
} from "@/lib/bracket/types";

export function buildKnockoutPredictionsMap(
  knockoutMatches: Array<{ id: string; fifa_match_number: number | null }>,
  predictions: Array<{
    match_id: string;
    predicted_home: number;
    predicted_away: number;
    predicted_advances_team_id: number | null;
  }>
): Map<number, KnockoutPredictionScores> {
  const predByMatchId = new Map(predictions.map((p) => [p.match_id, p]));
  const map = new Map<number, KnockoutPredictionScores>();

  for (const match of knockoutMatches) {
    if (!match.fifa_match_number) continue;
    const pred = predByMatchId.get(match.id);
    if (!pred) continue;
    map.set(match.fifa_match_number, {
      predictedHome: pred.predicted_home,
      predictedAway: pred.predicted_away,
      predictedAdvancesTeamId: pred.predicted_advances_team_id,
    });
  }

  return map;
}

/** Knockout matches whose home/away teams change when official third-place order is applied. */
export function computeThirdOrderAffectedMatchNumbers(
  knockoutDefs: KnockoutMatchDef[],
  teamRefs: TeamRef[],
  userGroupResults: GroupMatchResult[],
  predictedAdvancingThirdGroups: string[],
  officialAdvancingThirdGroups: string[],
  knockoutPredictions: Map<number, KnockoutPredictionScores>
): number[] {
  const withPredictedThirds = resolveAllKnockoutMatches(
    knockoutDefs,
    teamRefs,
    userGroupResults,
    predictedAdvancingThirdGroups,
    knockoutPredictions
  );
  const withOfficialThirds = resolveAllKnockoutMatches(
    knockoutDefs,
    teamRefs,
    userGroupResults,
    officialAdvancingThirdGroups,
    knockoutPredictions
  );

  const affected: number[] = [];
  for (const def of knockoutDefs) {
    const predicted = withPredictedThirds.get(def.fifaMatchNumber);
    const official = withOfficialThirds.get(def.fifaMatchNumber);
    if (!predicted || !official) continue;
    if (
      predicted.homeTeamId !== official.homeTeamId ||
      predicted.awayTeamId !== official.awayTeamId
    ) {
      affected.push(def.fifaMatchNumber);
    }
  }

  return affected;
}

export function mapAffectedNumbersToMatchIds(
  knockoutMatches: Array<{ id: string; fifa_match_number: number | null }>,
  affectedNumbers: number[]
): string[] {
  const numberSet = new Set(affectedNumbers);
  return knockoutMatches
    .filter((m) => m.fifa_match_number != null && numberSet.has(m.fifa_match_number))
    .map((m) => m.id);
}
