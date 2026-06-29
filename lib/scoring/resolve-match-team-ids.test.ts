import { describe, expect, it } from "vitest";
import type { BracketContext } from "@/lib/scoring/bracket-context";
import { resolveOfficialMatchTeamIds } from "@/lib/scoring/resolve-match-team-ids";

const MATCH_ID = "ko-match-1";

function ctxWithMatch(
  match: {
    id: string;
    fifa_match_number: number | null;
    home_team_id: number | null;
    away_team_id: number | null;
  },
  resolved?: Map<number, { homeTeamId: number | null; awayTeamId: number | null }>
): BracketContext {
  return {
    teams: [],
    matches: [],
    knockoutDefs: [],
    matchById: new Map([[match.id, { ...match, phase: "round_of_16" } as never]]),
    matchByNumber: new Map(),
    officialGroupResults: [],
    officialKnockoutResolved: resolved ?? new Map(),
    officialTeamsByPhase: new Map(),
    officialQualifiedToKnockout: new Set(),
  };
}

describe("resolveOfficialMatchTeamIds", () => {
  it("uses DB team IDs when both are set", () => {
    const ctx = ctxWithMatch({
      id: MATCH_ID,
      fifa_match_number: 73,
      home_team_id: 10,
      away_team_id: 20,
    });
    expect(resolveOfficialMatchTeamIds(ctx, MATCH_ID)).toEqual({
      homeTeamId: 10,
      awayTeamId: 20,
    });
  });

  it("falls back to officialKnockoutResolved when DB team IDs are null", () => {
    const ctx = ctxWithMatch(
      {
        id: MATCH_ID,
        fifa_match_number: 73,
        home_team_id: null,
        away_team_id: null,
      },
      new Map([[73, { homeTeamId: 10, awayTeamId: 20 }]])
    );
    expect(resolveOfficialMatchTeamIds(ctx, MATCH_ID)).toEqual({
      homeTeamId: 10,
      awayTeamId: 20,
    });
  });

  it("merges partial DB values with bracket resolution", () => {
    const ctx = ctxWithMatch(
      {
        id: MATCH_ID,
        fifa_match_number: 73,
        home_team_id: 10,
        away_team_id: null,
      },
      new Map([[73, { homeTeamId: 99, awayTeamId: 20 }]])
    );
    expect(resolveOfficialMatchTeamIds(ctx, MATCH_ID)).toEqual({
      homeTeamId: 10,
      awayTeamId: 20,
    });
  });

  it("prefers explicit overrides over DB and bracket", () => {
    const ctx = ctxWithMatch(
      {
        id: MATCH_ID,
        fifa_match_number: 73,
        home_team_id: null,
        away_team_id: null,
      },
      new Map([[73, { homeTeamId: 10, awayTeamId: 20 }]])
    );
    expect(
      resolveOfficialMatchTeamIds(ctx, MATCH_ID, {
        homeTeamId: 30,
        awayTeamId: 40,
      })
    ).toEqual({ homeTeamId: 30, awayTeamId: 40 });
  });
});
