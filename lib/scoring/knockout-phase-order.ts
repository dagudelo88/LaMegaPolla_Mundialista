import type { MatchPhase } from "@/lib/scoring/calculate-match-points";

/** Knockout phases in tournament order (excludes group_stage). */
export const KNOCKOUT_PHASES: MatchPhase[] = [
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
];

export const ROUND_COMPLETION_KEYS: MatchPhase[] = [
  "group_stage",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
];

/** Phase whose teams are compared when round_key completes. */
export function nextKnockoutPhaseAfterRound(roundKey: string): MatchPhase | null {
  switch (roundKey) {
    case "group_stage":
      return "round_of_32";
    case "round_of_32":
      return "round_of_16";
    case "round_of_16":
      return "quarter_final";
    case "quarter_final":
      return "semi_final";
    case "semi_final":
      return "final";
    case "third_place":
    case "final":
      return null;
    default:
      return null;
  }
}

export function phaseOrderIndex(phase: MatchPhase): number {
  if (phase === "group_stage") return 0;
  const idx = KNOCKOUT_PHASES.indexOf(phase);
  return idx === -1 ? -1 : idx + 1;
}
