import {
  calculateMatchPoints,
  type MatchPhase,
  type MatchResult,
  type PredictionInput,
  type ScoringConfig,
} from "@/lib/scoring/calculate-match-points";
import type { BracketContext } from "@/lib/scoring/bracket-context";
import {
  isKnockoutMatchScorableForUserByMatchNumber,
  type BracketGateResult,
} from "@/lib/scoring/bracket-gate";

export interface GatedMatchPointsResult {
  points: number;
  rawPoints: number;
  gate: BracketGateResult;
}

export function computeGatedMatchPoints(
  bracketCtx: BracketContext,
  userResolved: Map<number, { homeTeamId: number | null; awayTeamId: number | null }> | undefined,
  matchId: string,
  phase: MatchPhase,
  actual: MatchResult,
  predicted: PredictionInput,
  config: ScoringConfig
): GatedMatchPointsResult {
  const rawPoints = calculateMatchPoints(phase, actual, predicted, config);
  const gate = userResolved
    ? isKnockoutMatchScorableForUserByMatchNumber(bracketCtx, userResolved, matchId)
    : { scorable: true };

  return {
    points: gate.scorable ? rawPoints : 0,
    rawPoints,
    gate,
  };
}
