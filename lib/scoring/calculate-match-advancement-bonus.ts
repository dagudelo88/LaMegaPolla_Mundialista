import type { MatchPhase } from "@/lib/scoring/calculate-match-points";

export const DEFAULT_ADVANCEMENT_BONUS_PER_TEAM = 2;

export interface MatchAdvancementInput {
  phase: MatchPhase;
  homeTeamId: number;
  awayTeamId: number;
  predictedHome: number;
  predictedAway: number;
  predictedAdvancesTeamId: number | null;
  actualHome: number;
  actualAway: number;
  resultAdvancesTeamId: number | null;
}

/** Predicted advancer from knockout prediction (REGLAS §4). */
export function predictedAdvancingTeamId(input: {
  homeTeamId: number;
  awayTeamId: number;
  predictedHome: number;
  predictedAway: number;
  predictedAdvancesTeamId: number | null;
}): number {
  if (input.predictedHome > input.predictedAway) return input.homeTeamId;
  if (input.predictedAway > input.predictedHome) return input.awayTeamId;
  if (input.predictedAdvancesTeamId != null) return input.predictedAdvancesTeamId;
  return input.homeTeamId;
}

/** Official advancer after 90 minutes (+ penales via result_advances_team_id). */
export function officialAdvancingTeamId(input: {
  homeTeamId: number;
  awayTeamId: number;
  actualHome: number;
  actualAway: number;
  resultAdvancesTeamId: number | null;
}): number | null {
  if (input.actualHome > input.actualAway) return input.homeTeamId;
  if (input.actualAway > input.actualHome) return input.awayTeamId;
  return input.resultAdvancesTeamId;
}

export function calculateMatchAdvancementBonus(
  input: MatchAdvancementInput,
  bonusPerTeam: number = DEFAULT_ADVANCEMENT_BONUS_PER_TEAM
): number {
  if (input.phase === "group_stage") return 0;

  const predicted = predictedAdvancingTeamId(input);
  const official = officialAdvancingTeamId(input);
  if (official == null) return 0;
  return predicted === official ? bonusPerTeam : 0;
}
