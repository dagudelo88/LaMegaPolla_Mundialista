/**
 * Scoring engine — source of truth: REGLAS.md §4
 * Only 90 minutes + stoppage time count (no extra time / penalties in score).
 */

export type MatchPhase =
  | "group_stage"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final";

export interface ScoringConfig {
  groupExact: number;
  groupWinnerOnly: number;
  knockoutExact: number;
  knockoutWinnerOnly: number;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  groupExact: 10,
  groupWinnerOnly: 5,
  knockoutExact: 20,
  knockoutWinnerOnly: 10,
};

export interface MatchResult {
  home: number;
  away: number;
}

export interface PredictionInput {
  home: number;
  away: number;
}

function isKnockout(phase: MatchPhase): boolean {
  return phase !== "group_stage";
}

function outcome(h: number, a: number): "home" | "away" | "draw" {
  if (h > a) return "home";
  if (a > h) return "away";
  return "draw";
}

/**
 * Raw §4 table points (marcador vs resultado). For knockouts, always combine with
 * `computeGatedMatchPoints` / REGLAS §7 before persisting or showing final points.
 */
export function calculateMatchPoints(
  phase: MatchPhase,
  actual: MatchResult,
  predicted: PredictionInput,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): number {
  const knockout = isKnockout(phase);
  const exactPts = knockout ? config.knockoutExact : config.groupExact;
  const winnerPts = knockout ? config.knockoutWinnerOnly : config.groupWinnerOnly;

  const actualOut = outcome(actual.home, actual.away);
  const predOut = outcome(predicted.home, predicted.away);

  const exactScore =
    actual.home === predicted.home && actual.away === predicted.away;
  const correctOutcome = actualOut === predOut;

  if (!correctOutcome) return 0;
  if (exactScore) return exactPts;
  return winnerPts;
}

/** REGLAS §4: pleno = 10 in groups or 20 in knockout */
export function isPleno(
  phase: MatchPhase,
  actual: MatchResult,
  predicted: PredictionInput,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): boolean {
  return calculateMatchPoints(phase, actual, predicted, config) === (isKnockout(phase) ? config.knockoutExact : config.groupExact);
}
