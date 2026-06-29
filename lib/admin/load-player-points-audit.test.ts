import { describe, expect, it } from "vitest";
import type { BracketContext } from "@/lib/scoring/bracket-context";
import { eligibleAdvancementAuditRoundKeys } from "@/lib/admin/load-player-points-audit";

function ctxWithKnockoutMatches(
  matches: Array<{
    phase: string;
    status: string;
    home_score?: number | null;
    away_score?: number | null;
  }>,
  groupsComplete = true
): BracketContext {
  const groupMatches = groupsComplete
    ? Array.from({ length: 6 }, () => ({
        phase: "group_stage",
        status: "finished",
        home_score: 1,
        away_score: 0,
      }))
    : [{ phase: "group_stage", status: "scheduled", home_score: null, away_score: null }];

  return {
    teams: [],
    matches: [...groupMatches, ...matches],
    officialGroupResults: groupsComplete ? [{}] : [],
  } as unknown as BracketContext;
}

describe("eligibleAdvancementAuditRoundKeys", () => {
  it("includes group_stage when groups are complete", () => {
    const ctx = ctxWithKnockoutMatches([]);
    expect(eligibleAdvancementAuditRoundKeys(ctx)).toContain("group_stage");
  });

  it("excludes round_of_32 while dieciseisavos are still in play", () => {
    const ctx = ctxWithKnockoutMatches([
      { phase: "round_of_32", status: "finished", home_score: 1, away_score: 0 },
      { phase: "round_of_32", status: "scheduled", home_score: null, away_score: null },
    ]);
    const keys = eligibleAdvancementAuditRoundKeys(ctx);
    expect(keys).toContain("group_stage");
    expect(keys).not.toContain("round_of_32");
  });

  it("includes round_of_32 when all R32 matches are finished", () => {
    const ctx = ctxWithKnockoutMatches([
      { phase: "round_of_32", status: "finished", home_score: 1, away_score: 0 },
      { phase: "round_of_32", status: "finished", home_score: 2, away_score: 1 },
    ]);
    expect(eligibleAdvancementAuditRoundKeys(ctx)).toContain("round_of_32");
  });
});
