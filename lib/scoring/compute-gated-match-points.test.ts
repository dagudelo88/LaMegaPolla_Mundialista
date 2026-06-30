import { describe, expect, it } from "vitest";
import { computeGatedMatchPoints } from "@/lib/scoring/compute-gated-match-points";
import { DEFAULT_SCORING_CONFIG } from "@/lib/scoring/calculate-match-points";
import type { BracketContext } from "@/lib/scoring/bracket-context";

describe("computeGatedMatchPoints", () => {
  const matchId = "match-74";
  const ctx = {
    teams: [],
    matches: [
      {
        id: matchId,
        fifa_match_number: 74,
        phase: "round_of_32",
        group_letter: null,
        home_team_id: 10,
        away_team_id: 12,
        home_source: null,
        away_source: null,
        home_score: 1,
        away_score: 1,
        status: "finished",
        result_advances_team_id: 10,
      },
    ],
    knockoutDefs: [],
    matchById: new Map(),
    matchByNumber: new Map([[74, { id: matchId, fifa_match_number: 74 } as never]]),
    officialGroupResults: [],
    officialKnockoutResolved: new Map([[74, { homeTeamId: 10, awayTeamId: 12 }]]),
    officialTeamsByPhase: new Map([["round_of_32", new Set([10, 12])]]),
    officialQualifiedToKnockout: new Set([10, 12]),
  } as unknown as BracketContext;

  ctx.matchById.set(matchId, ctx.matches[0] as never);

  const userResolved = new Map([
    [74, { homeTeamId: 10, awayTeamId: 11 }],
  ]);

  it("returns 0 when gate blocks despite exact score", () => {
    const result = computeGatedMatchPoints(
      ctx,
      userResolved,
      matchId,
      "round_of_32",
      { home: 1, away: 1 },
      { home: 1, away: 1 },
      DEFAULT_SCORING_CONFIG
    );
    expect(result.rawPoints).toBe(20);
    expect(result.points).toBe(0);
    expect(result.gate.scorable).toBe(false);
  });
});
