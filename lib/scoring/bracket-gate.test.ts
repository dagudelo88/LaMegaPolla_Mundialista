import { describe, expect, it } from "vitest";
import type { BracketContext } from "@/lib/scoring/bracket-context";
import { isKnockoutMatchScorableForUser } from "@/lib/scoring/bracket-gate";

function minimalCtx(
  officialTeamsByPhase: Map<string, Set<number>>
): BracketContext {
  return {
    teams: [],
    matches: [],
    knockoutDefs: [],
    matchById: new Map(),
    matchByNumber: new Map(),
    officialGroupResults: [],
    officialKnockoutResolved: new Map(),
    officialTeamsByPhase: officialTeamsByPhase as BracketContext["officialTeamsByPhase"],
    officialQualifiedToKnockout: new Set(),
  };
}

describe("isKnockoutMatchScorableForUser", () => {
  it("allows group stage always", () => {
    const result = isKnockoutMatchScorableForUser(
      minimalCtx(new Map()),
      "group_stage",
      1,
      2
    );
    expect(result.scorable).toBe(true);
  });

  it("blocks when user team not in official phase", () => {
    const official = new Map();
    official.set("quarter_final", new Set([10, 20]));
    const result = isKnockoutMatchScorableForUser(
      minimalCtx(official),
      "quarter_final",
      99,
      20
    );
    expect(result.scorable).toBe(false);
    expect(result.blockedTeams).toContain(99);
  });

  it("allows when both teams official in phase", () => {
    const official = new Map();
    official.set("round_of_16", new Set([10, 20]));
    const result = isKnockoutMatchScorableForUser(
      minimalCtx(official),
      "round_of_16",
      10,
      20
    );
    expect(result.scorable).toBe(true);
  });
});
