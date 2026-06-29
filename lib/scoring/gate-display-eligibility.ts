import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import type { BracketContext } from "@/lib/scoring/bracket-context";
import { isRoundComplete } from "@/lib/scoring/bracket-context";

const PRIOR_ROUND_BY_PHASE: Partial<Record<MatchPhase, string>> = {
  round_of_32: "group_stage",
  round_of_16: "round_of_32",
  quarter_final: "round_of_16",
  semi_final: "quarter_final",
  third_place: "semi_final",
  final: "semi_final",
};

export function priorRoundKeyForKnockoutPhase(phase: MatchPhase): string | null {
  return PRIOR_ROUND_BY_PHASE[phase] ?? null;
}

/**
 * §7 gate UI is only meaningful once the prior round is officially settled.
 * E.g. do not show octavos blocks while dieciseisavos are still in play.
 */
export function isGateDisplayEligibleForPhase(
  ctx: BracketContext,
  phase: MatchPhase
): boolean {
  const priorRound = priorRoundKeyForKnockoutPhase(phase);
  if (!priorRound) return false;
  return isRoundComplete(ctx, priorRound);
}
