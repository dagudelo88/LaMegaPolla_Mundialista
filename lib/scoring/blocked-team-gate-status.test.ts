import { describe, expect, it } from "vitest";
import type { BracketContext } from "@/lib/scoring/bracket-context";
import { getBlockedTeamGateDetails } from "@/lib/scoring/blocked-team-gate-status";

function ctxWithOfficialPhases(
  phases: Record<string, number[]>
): BracketContext {
  const officialTeamsByPhase = new Map();
  for (const [phase, teamIds] of Object.entries(phases)) {
    officialTeamsByPhase.set(phase, new Set(teamIds));
  }
  return { officialTeamsByPhase } as BracketContext;
}

describe("getBlockedTeamGateDetails", () => {
  it("marks teams that never reached knockout", () => {
    const ctx = ctxWithOfficialPhases({
      round_of_32: [10, 20],
    });
    const [detail] = getBlockedTeamGateDetails(ctx, [99], "round_of_32");
    expect(detail).toEqual({ teamId: 99, status: "not_in_knockout" });
  });

  it("marks teams eliminated before the target phase", () => {
    const ctx = ctxWithOfficialPhases({
      round_of_32: [10, 20],
      round_of_16: [10],
    });
    const [detail] = getBlockedTeamGateDetails(ctx, [20], "round_of_16");
    expect(detail).toEqual({
      teamId: 20,
      status: "eliminated_before",
      lastOfficialPhase: "round_of_32",
    });
  });
});
