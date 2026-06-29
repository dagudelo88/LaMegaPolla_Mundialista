import { describe, expect, it } from "vitest";
import type { BracketContext } from "@/lib/scoring/bracket-context";
import { isGateDisplayEligibleForPhase } from "@/lib/scoring/gate-display-eligibility";

function ctxWithMatches(
  matches: Array<{ phase: string; status: string; home_score?: number | null; away_score?: number | null }>,
  groupsComplete = true
): BracketContext {
  const groupMatches = groupsComplete
    ? ["A", "B"].flatMap((g) =>
        [1, 2, 3].map((i) => ({
          phase: "group_stage",
          status: "finished",
          home_score: 1,
          away_score: 0,
          group_letter: g,
        }))
      )
    : [{ phase: "group_stage", status: "scheduled", home_score: null, away_score: null }];

  return {
    teams: [],
    matches: [...groupMatches, ...matches],
    officialGroupResults: groupsComplete ? [{}, {}] as never[] : [],
  } as unknown as BracketContext;
}

describe("isGateDisplayEligibleForPhase", () => {
  it("allows R32 gates once group stage is complete", () => {
    const ctx = ctxWithMatches([]);
    expect(isGateDisplayEligibleForPhase(ctx, "round_of_32")).toBe(true);
  });

  it("blocks R16 gates until all R32 matches are finished", () => {
    const ctx = ctxWithMatches([
      { phase: "round_of_32", status: "finished", home_score: 1, away_score: 0 },
      { phase: "round_of_32", status: "scheduled", home_score: null, away_score: null },
    ]);
    expect(isGateDisplayEligibleForPhase(ctx, "round_of_16")).toBe(false);
  });

  it("allows R16 gates when R32 is complete", () => {
    const ctx = ctxWithMatches([
      { phase: "round_of_32", status: "finished", home_score: 1, away_score: 0 },
      { phase: "round_of_32", status: "finished", home_score: 2, away_score: 1 },
    ]);
    expect(isGateDisplayEligibleForPhase(ctx, "round_of_16")).toBe(true);
  });
});
