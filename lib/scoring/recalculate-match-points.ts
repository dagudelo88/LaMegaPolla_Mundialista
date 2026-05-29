import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import {
  calculateMatchPoints,
  type MatchResult,
  type PredictionInput,
  type ScoringConfig,
} from "@/lib/scoring/calculate-match-points";

export interface PredictionRow {
  predicted_home: number;
  predicted_away: number;
}

export function pointsForFinishedMatch(
  phase: MatchPhase,
  actual: MatchResult,
  prediction: PredictionInput,
  config: ScoringConfig
): number {
  return calculateMatchPoints(phase, actual, prediction, config);
}

export function sumProfilePoints(
  entries: { phase: MatchPhase; actual: MatchResult; prediction: PredictionInput }[],
  config: ScoringConfig
): number {
  return entries.reduce(
    (sum, e) =>
      sum + calculateMatchPoints(e.phase, e.actual, e.prediction, config),
    0
  );
}
