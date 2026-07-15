import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedMatchTeams } from "@/lib/bracket/types";

const resolveKnockoutMatch = vi.fn();

vi.mock("@/lib/bracket/knockout-resolver", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bracket/knockout-resolver")>();
  return {
    ...actual,
    resolveKnockoutMatch: (...args: unknown[]) => resolveKnockoutMatch(...args),
  };
});

import { resolveOfficialBracket } from "@/lib/bracket/resolve-official-bracket";

type MatchRow = {
  id: string;
  fifa_match_number: number | null;
  phase: string;
  home_team_id: number | null;
  away_team_id: number | null;
  home_source: unknown;
  away_source: unknown;
  home_score: number | null;
  away_score: number | null;
  status: string;
  result_advances_team_id: number | null;
};

function makeTeam(id: number, code: string, group: string) {
  return {
    id,
    fifa_code: code,
    group_letter: group,
    fifa_ranking: id,
    team_conduct_score: 0,
    manual_tie_break_rank: null,
  };
}

function createMockAdmin(teams: ReturnType<typeof makeTeam>[], matches: MatchRow[]) {
  const updates: Array<{
    id: string;
    home_team_id: number | null;
    away_team_id: number | null;
  }> = [];

  const admin = {
    from(table: string) {
      if (table === "teams") {
        return {
          select: vi.fn(async () => ({ data: teams, error: null })),
        };
      }
      if (table === "matches") {
        return {
          select: vi.fn(() => ({
            order: vi.fn(async () => ({ data: matches, error: null })),
          })),
          update: vi.fn((payload: { home_team_id: number | null; away_team_id: number | null }) => ({
            eq: vi.fn(async (col: string, id: string) => {
              expect(col).toBe("id");
              const row = matches.find((m) => m.id === id);
              if (row) {
                row.home_team_id = payload.home_team_id;
                row.away_team_id = payload.away_team_id;
              }
              updates.push({ id, ...payload });
              return { data: null, error: null };
            }),
          })),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return { admin, updates };
}

describe("resolveOfficialBracket partial finalists", () => {
  const spainId = 10;
  const franceId = 11;

  beforeEach(() => {
    resolveKnockoutMatch.mockReset();
  });

  it("persists a known finalist when only one semi is finished", async () => {
    const teams = [
      makeTeam(spainId, "ESP", "H"),
      makeTeam(franceId, "FRA", "I"),
      makeTeam(20, "BRA", "C"),
      makeTeam(21, "ARG", "J"),
    ];

    const matches: MatchRow[] = [
      {
        id: "sf-101",
        fifa_match_number: 101,
        phase: "semi_final",
        home_team_id: spainId,
        away_team_id: franceId,
        home_source: { type: "match_winner", match_number: 97 },
        away_source: { type: "match_winner", match_number: 98 },
        home_score: 2,
        away_score: 0,
        status: "finished",
        result_advances_team_id: null,
      },
      {
        id: "sf-102",
        fifa_match_number: 102,
        phase: "semi_final",
        home_team_id: 20,
        away_team_id: 21,
        home_source: { type: "match_winner", match_number: 99 },
        away_source: { type: "match_winner", match_number: 100 },
        home_score: null,
        away_score: null,
        status: "scheduled",
        result_advances_team_id: null,
      },
      {
        id: "final-104",
        fifa_match_number: 104,
        phase: "final",
        home_team_id: null,
        away_team_id: null,
        home_source: { type: "match_winner", match_number: 101 },
        away_source: { type: "match_winner", match_number: 102 },
        home_score: null,
        away_score: null,
        status: "scheduled",
        result_advances_team_id: null,
      },
    ];

    resolveKnockoutMatch.mockImplementation((def: { fifaMatchNumber: number }): ResolvedMatchTeams => {
      if (def.fifaMatchNumber === 101) {
        return { homeTeamId: spainId, awayTeamId: franceId, unresolved: false };
      }
      if (def.fifaMatchNumber === 102) {
        return { homeTeamId: 20, awayTeamId: 21, unresolved: false };
      }
      if (def.fifaMatchNumber === 104) {
        // Only W101 known — mirrors real resolveKnockoutMatch with one semi done
        return { homeTeamId: spainId, awayTeamId: null, unresolved: true };
      }
      return { homeTeamId: null, awayTeamId: null, unresolved: true };
    });

    const { admin, updates } = createMockAdmin(teams, matches);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveOfficialBracket(admin as any);

    const final = matches.find((m) => m.fifa_match_number === 104)!;
    expect(final.home_team_id).toBe(spainId);
    expect(final.away_team_id).toBeNull();
    expect(result.unresolvedMatches).toBeGreaterThan(0);
    expect(
      updates.some(
        (u) => u.id === "final-104" && u.home_team_id === spainId && u.away_team_id === null
      )
    ).toBe(true);
  });

  it("does not clear a partially filled final on re-resolve", async () => {
    const teams = [
      makeTeam(spainId, "ESP", "H"),
      makeTeam(franceId, "FRA", "I"),
      makeTeam(20, "BRA", "C"),
      makeTeam(21, "ARG", "J"),
    ];

    const matches: MatchRow[] = [
      {
        id: "sf-101",
        fifa_match_number: 101,
        phase: "semi_final",
        home_team_id: spainId,
        away_team_id: franceId,
        home_source: { type: "match_winner", match_number: 97 },
        away_source: { type: "match_winner", match_number: 98 },
        home_score: 2,
        away_score: 0,
        status: "finished",
        result_advances_team_id: null,
      },
      {
        id: "sf-102",
        fifa_match_number: 102,
        phase: "semi_final",
        home_team_id: 20,
        away_team_id: 21,
        home_source: { type: "match_winner", match_number: 99 },
        away_source: { type: "match_winner", match_number: 100 },
        home_score: null,
        away_score: null,
        status: "scheduled",
        result_advances_team_id: null,
      },
      {
        id: "final-104",
        fifa_match_number: 104,
        phase: "final",
        home_team_id: spainId,
        away_team_id: null,
        home_source: { type: "match_winner", match_number: 101 },
        away_source: { type: "match_winner", match_number: 102 },
        home_score: null,
        away_score: null,
        status: "scheduled",
        result_advances_team_id: null,
      },
    ];

    resolveKnockoutMatch.mockImplementation((def: { fifaMatchNumber: number }): ResolvedMatchTeams => {
      if (def.fifaMatchNumber === 101) {
        return { homeTeamId: spainId, awayTeamId: franceId, unresolved: false };
      }
      if (def.fifaMatchNumber === 102) {
        return { homeTeamId: 20, awayTeamId: 21, unresolved: false };
      }
      if (def.fifaMatchNumber === 104) {
        return { homeTeamId: spainId, awayTeamId: null, unresolved: true };
      }
      return { homeTeamId: null, awayTeamId: null, unresolved: true };
    });

    const { admin, updates } = createMockAdmin(teams, matches);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await resolveOfficialBracket(admin as any);

    const final = matches.find((m) => m.fifa_match_number === 104)!;
    expect(final.home_team_id).toBe(spainId);
    expect(final.away_team_id).toBeNull();
    expect(updates.some((u) => u.id === "final-104" && u.home_team_id === null)).toBe(
      false
    );
  });
});
