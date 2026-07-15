import { describe, expect, it } from "vitest";
import { computeGroupStanding } from "@/lib/bracket/group-standings";
import {
  resolveAllKnockoutMatches,
  resolveKnockoutMatch,
  resolveTournamentPodium,
  FINAL_MATCH_NUMBER,
  THIRD_PLACE_MATCH_NUMBER,
} from "@/lib/bracket/knockout-resolver";
import {
  resolveThirdPlaceScenarioGroups,
  resolveThirdPlaceScenarioTeams,
  rankThirdPlaceTeams,
  validateThirdPlaceSelection,
  computeAdvancingThirdGroups,
  rankAllThirdPlaceTeams,
} from "@/lib/bracket/third-place-advancement";
import type { GroupMatchResult, GroupStanding, KnockoutMatchDef, MatchWinnerContext, StandingRow, TeamRef } from "@/lib/bracket/types";
import knockoutMatches from "@/data/fifa-2026/knockout-matches.json";

const teamsA: TeamRef[] = [
  { id: 1, fifaCode: "MEX", groupLetter: "A" },
  { id: 2, fifaCode: "RSA", groupLetter: "A" },
  { id: 3, fifaCode: "KOR", groupLetter: "A" },
  { id: 4, fifaCode: "CZE", groupLetter: "A" },
];

function standingRow(
  row: Omit<StandingRow, "teamConductScore" | "fifaRanking" | "manualTieBreakRank"> &
    Partial<Pick<StandingRow, "teamConductScore" | "fifaRanking" | "manualTieBreakRank">>
): StandingRow {
  return {
    teamConductScore: 0,
    fifaRanking: null,
    manualTieBreakRank: null,
    ...row,
  };
}

describe("computeGroupStanding", () => {
  it("ranks teams by points from predicted scores", () => {
    const results: GroupMatchResult[] = [
      { homeTeamId: 1, awayTeamId: 2, homeGoals: 2, awayGoals: 0 },
      { homeTeamId: 3, awayTeamId: 4, homeGoals: 1, awayGoals: 1 },
      { homeTeamId: 4, awayTeamId: 2, homeGoals: 0, awayGoals: 1 },
      { homeTeamId: 1, awayTeamId: 3, homeGoals: 3, awayGoals: 0 },
      { homeTeamId: 4, awayTeamId: 1, homeGoals: 0, awayGoals: 2 },
      { homeTeamId: 2, awayTeamId: 3, homeGoals: 1, awayGoals: 1 },
    ];
    const standing = computeGroupStanding("A", teamsA, results);
    expect(standing.positions[0].teamId).toBe(1);
    expect(standing.positions[0].pts).toBe(9);
    expect(standing.positions[2].rank).toBe(3);
  });

  it("uses head-to-head before total goal difference for a two-team tie", () => {
    const teams: TeamRef[] = [
      { id: 1, fifaCode: "AAA", groupLetter: "A" },
      { id: 2, fifaCode: "BBB", groupLetter: "A" },
      { id: 3, fifaCode: "CCC", groupLetter: "A" },
      { id: 4, fifaCode: "DDD", groupLetter: "A" },
    ];
    const results: GroupMatchResult[] = [
      { homeTeamId: 1, awayTeamId: 2, homeGoals: 1, awayGoals: 0 },
      { homeTeamId: 1, awayTeamId: 3, homeGoals: 0, awayGoals: 3 },
      { homeTeamId: 1, awayTeamId: 4, homeGoals: 1, awayGoals: 0 },
      { homeTeamId: 2, awayTeamId: 3, homeGoals: 4, awayGoals: 0 },
      { homeTeamId: 2, awayTeamId: 4, homeGoals: 4, awayGoals: 0 },
      { homeTeamId: 3, awayTeamId: 4, homeGoals: 0, awayGoals: 0 },
    ];

    const standing = computeGroupStanding("A", teams, results);

    expect(standing.positions.map((row) => row.teamId).slice(0, 2)).toEqual([1, 2]);
  });

  it("reapplies head-to-head among remaining teams in a three-team tie", () => {
    const teams: TeamRef[] = [
      { id: 1, fifaCode: "AAA", groupLetter: "A" },
      { id: 2, fifaCode: "BBB", groupLetter: "A" },
      { id: 3, fifaCode: "CCC", groupLetter: "A" },
      { id: 4, fifaCode: "DDD", groupLetter: "A" },
    ];
    const results: GroupMatchResult[] = [
      { homeTeamId: 1, awayTeamId: 2, homeGoals: 1, awayGoals: 0 },
      { homeTeamId: 2, awayTeamId: 3, homeGoals: 3, awayGoals: 0 },
      { homeTeamId: 3, awayTeamId: 1, homeGoals: 2, awayGoals: 0 },
      { homeTeamId: 1, awayTeamId: 4, homeGoals: 1, awayGoals: 0 },
      { homeTeamId: 2, awayTeamId: 4, homeGoals: 1, awayGoals: 0 },
      { homeTeamId: 3, awayTeamId: 4, homeGoals: 1, awayGoals: 0 },
    ];

    const standing = computeGroupStanding("A", teams, results);

    expect(standing.positions.map((row) => row.teamId)).toEqual([2, 3, 1, 4]);
  });
});

describe("third place advancement", () => {
  it("requires exactly 8 groups", () => {
    expect(validateThirdPlaceSelection(["A", "B"]).valid).toBe(false);
    const eight = ["A", "B", "C", "D", "E", "F", "G", "H"];
    expect(validateThirdPlaceSelection(eight).valid).toBe(true);
  });
});

describe("resolveKnockoutMatch (official)", () => {
  it("returns partial teams for the final when only one semi has a winner", () => {
    const winners = new Map<number, number>([[101, 10]]);
    const resolved = resolveKnockoutMatch(
      {
        fifaMatchNumber: 104,
        phase: "final",
        homeSource: { type: "match_winner", match_number: 101 },
        awaySource: { type: "match_winner", match_number: 102 },
      },
      [],
      [],
      [],
      winners,
      new Map()
    );

    expect(resolved.homeTeamId).toBe(10);
    expect(resolved.awayTeamId).toBeNull();
    expect(resolved.unresolved).toBe(true);
  });

  it("keeps round of 32 unresolved when group stage has no official results", () => {
    const teams: TeamRef[] = [
      ...teamsA,
      { id: 5, fifaCode: "CAN", groupLetter: "B" },
      { id: 6, fifaCode: "BIH", groupLetter: "B" },
      { id: 7, fifaCode: "QAT", groupLetter: "B" },
      { id: 8, fifaCode: "SUI", groupLetter: "B" },
    ];

    const resolved = resolveKnockoutMatch(
      {
        fifaMatchNumber: 73,
        phase: "round_of_32",
        homeSource: { type: "group_rank", group: "A", rank: 2 },
        awaySource: { type: "group_rank", group: "B", rank: 2 },
      },
      teams,
      [],
      [],
      new Map(),
      new Map(),
      { requireOfficialGroupCompletion: true }
    );

    expect(resolved.unresolved).toBe(true);
    expect(resolved.homeTeamId).toBeNull();
    expect(resolved.awayTeamId).toBeNull();
  });
});

describe("resolveAllKnockoutMatches", () => {
  it("resolves round of 32 from group ranks", () => {
    const teams: TeamRef[] = [
      ...teamsA,
      { id: 5, fifaCode: "CAN", groupLetter: "B" },
      { id: 6, fifaCode: "BIH", groupLetter: "B" },
      { id: 7, fifaCode: "QAT", groupLetter: "B" },
      { id: 8, fifaCode: "SUI", groupLetter: "B" },
    ];

    const groupResults: GroupMatchResult[] = [
      { homeTeamId: 1, awayTeamId: 2, homeGoals: 2, awayGoals: 0 },
      { homeTeamId: 3, awayTeamId: 4, homeGoals: 1, awayGoals: 0 },
      { homeTeamId: 4, awayTeamId: 2, homeGoals: 0, awayGoals: 2 },
      { homeTeamId: 1, awayTeamId: 3, homeGoals: 1, awayGoals: 0 },
      { homeTeamId: 4, awayTeamId: 1, homeGoals: 0, awayGoals: 3 },
      { homeTeamId: 2, awayTeamId: 3, homeGoals: 1, awayGoals: 1 },
      { homeTeamId: 5, awayTeamId: 6, homeGoals: 2, awayGoals: 0 },
      { homeTeamId: 7, awayTeamId: 8, homeGoals: 0, awayGoals: 1 },
      { homeTeamId: 8, awayTeamId: 6, homeGoals: 2, awayGoals: 0 },
      { homeTeamId: 5, awayTeamId: 7, homeGoals: 1, awayGoals: 0 },
      { homeTeamId: 8, awayTeamId: 5, homeGoals: 1, awayGoals: 0 },
      { homeTeamId: 6, awayTeamId: 7, homeGoals: 0, awayGoals: 1 },
    ];

    const knockoutDefs: KnockoutMatchDef[] = [
      {
        fifaMatchNumber: 73,
        phase: "round_of_32",
        homeSource: { type: "group_rank", group: "A", rank: 2 },
        awaySource: { type: "group_rank", group: "B", rank: 2 },
      },
    ];

    const resolved = resolveAllKnockoutMatches(
      knockoutDefs,
      teams,
      groupResults,
      ["A", "B", "C", "D", "E", "F", "G", "H"],
      new Map<number, MatchWinnerContext>()
    );

    const m73 = resolved.get(73);
    expect(m73?.unresolved).toBe(false);
    const standingA = computeGroupStanding("A", teams, groupResults);
    const standingB = computeGroupStanding("B", teams, groupResults);
    expect(m73?.homeTeamId).toBe(standingA.positions.find((p) => p.rank === 2)?.teamId);
    expect(m73?.awayTeamId).toBe(standingB.positions.find((p) => p.rank === 2)?.teamId);
  });
});

describe("computeAdvancingThirdGroups", () => {
  it("picks top 8 third-place teams by ranking", () => {
    const makeStanding = (
      group: string,
      thirdPts: number,
      thirdGd: number,
      thirdGf: number,
      code: string,
      teamId: number
    ): GroupStanding => ({
      group,
      positions: [
        standingRow({ rank: 1, teamId: teamId + 100, fifaCode: "X1", played: 3, won: 3, drawn: 0, lost: 0, gf: 6, gc: 0, gd: 6, pts: 9 }),
        standingRow({ rank: 2, teamId: teamId + 200, fifaCode: "X2", played: 3, won: 1, drawn: 1, lost: 1, gf: 3, gc: 3, gd: 0, pts: 4 }),
        standingRow({ rank: 3, teamId, fifaCode: code, played: 3, won: 1, drawn: 0, lost: 2, gf: thirdGf, gc: 4, gd: thirdGd, pts: thirdPts }),
        standingRow({ rank: 4, teamId: teamId + 300, fifaCode: "X4", played: 3, won: 0, drawn: 1, lost: 2, gf: 1, gc: 5, gd: -4, pts: 1 }),
      ],
    });

    const standings = [
      makeStanding("A", 6, 2, 5, "AAA", 1),
      makeStanding("B", 6, 1, 5, "BBB", 2),
      makeStanding("C", 5, 3, 4, "CCC", 3),
      makeStanding("D", 5, 2, 4, "DDD", 4),
      makeStanding("E", 5, 1, 4, "EEE", 5),
      makeStanding("F", 4, 2, 3, "FFF", 6),
      makeStanding("G", 4, 1, 3, "GGG", 7),
      makeStanding("H", 3, 2, 2, "HHH", 8),
      makeStanding("I", 3, 1, 2, "III", 9),
      makeStanding("J", 3, 0, 2, "JJJ", 10),
      makeStanding("K", 2, 1, 1, "KKK", 11),
      makeStanding("L", 2, 0, 1, "LLL", 12),
    ];

    const advancing = computeAdvancingThirdGroups(standings);
    expect(advancing).toHaveLength(8);
    expect(advancing).toContain("A");
    expect(advancing).toContain("B");
    expect(advancing).not.toContain("L");

    const ranked = rankAllThirdPlaceTeams(standings);
    expect(ranked.filter((r) => r.advances)).toHaveLength(8);
    expect(ranked[0].group).toBe("A");
  });
});

describe("third-place FIFA criteria and scenarios", () => {
  function makeGroupWithThird(
    group: string,
    teamId: number,
    overrides: Partial<StandingRow> = {}
  ): GroupStanding {
    return {
      group,
      positions: [
        standingRow({ rank: 1, teamId: teamId + 1000, fifaCode: `${group}1`, played: 3, won: 2, drawn: 1, lost: 0, gf: 5, gc: 1, gd: 4, pts: 7 }),
        standingRow({ rank: 2, teamId: teamId + 2000, fifaCode: `${group}2`, played: 3, won: 1, drawn: 2, lost: 0, gf: 4, gc: 2, gd: 2, pts: 5 }),
        standingRow({ rank: 3, teamId, fifaCode: `${group}3`, played: 3, won: 1, drawn: 0, lost: 2, gf: 3, gc: 3, gd: 0, pts: 3, ...overrides }),
        standingRow({ rank: 4, teamId: teamId + 3000, fifaCode: `${group}4`, played: 3, won: 0, drawn: 1, lost: 2, gf: 1, gc: 7, gd: -6, pts: 1 }),
      ],
    };
  }

  it("uses conduct score and FIFA ranking to rank third-place teams", () => {
    const standings: GroupStanding[] = [
      makeGroupWithThird("A", 1, { teamConductScore: -2, fifaRanking: 1 }),
      makeGroupWithThird("B", 2, { teamConductScore: -1, fifaRanking: 20 }),
      makeGroupWithThird("C", 3, { teamConductScore: -1, fifaRanking: 5 }),
    ];

    const ranked = rankThirdPlaceTeams(standings, ["A", "B", "C"]);

    expect(ranked.map((row) => row.teamId)).toEqual([3, 2, 1]);
  });

  it("assigns third-place teams through Annex C scenarios", () => {
    const advancing = ["E", "F", "G", "H", "I", "J", "K", "L"];
    const standings = "ABCDEFGHIJKL"
      .split("")
      .map((group, index) => makeGroupWithThird(group, index + 1));

    const scenarioGroups = resolveThirdPlaceScenarioGroups(advancing);
    const scenarioTeams = resolveThirdPlaceScenarioTeams(standings, advancing);

    expect(scenarioGroups.get(79)).toBe("E");
    expect(scenarioGroups.get(85)).toBe("J");
    expect(scenarioGroups.get(81)).toBe("I");
    expect(scenarioGroups.get(74)).toBe("F");
    expect(scenarioTeams.get(74)).toBe(6);
    expect(new Set(scenarioTeams.values()).size).toBe(8);
  });
});

describe("resolveTournamentPodium", () => {
  it("derives champion, runner-up and third place from final and third-place matches", () => {
    const teams: TeamRef[] = [
      { id: 1, fifaCode: "ARG", groupLetter: "J" },
      { id: 2, fifaCode: "FRA", groupLetter: "I" },
      { id: 3, fifaCode: "ESP", groupLetter: "H" },
    ];

    const knockoutDefs: KnockoutMatchDef[] = [
      {
        fifaMatchNumber: THIRD_PLACE_MATCH_NUMBER,
        phase: "third_place",
        homeSource: { type: "group_rank", group: "J", rank: 1 },
        awaySource: { type: "group_rank", group: "I", rank: 1 },
      },
      {
        fifaMatchNumber: FINAL_MATCH_NUMBER,
        phase: "final",
        homeSource: { type: "group_rank", group: "J", rank: 1 },
        awaySource: { type: "group_rank", group: "I", rank: 1 },
      },
    ];

    const groupResults: GroupMatchResult[] = [
      { homeTeamId: 1, awayTeamId: 2, homeGoals: 3, awayGoals: 0 },
      { homeTeamId: 1, awayTeamId: 3, homeGoals: 2, awayGoals: 0 },
      { homeTeamId: 2, awayTeamId: 3, homeGoals: 1, awayGoals: 0 },
      { homeTeamId: 2, awayTeamId: 1, homeGoals: 0, awayGoals: 2 },
      { homeTeamId: 3, awayTeamId: 1, homeGoals: 0, awayGoals: 1 },
      { homeTeamId: 3, awayTeamId: 2, homeGoals: 0, awayGoals: 2 },
    ];

    const predictions = new Map([
      [THIRD_PLACE_MATCH_NUMBER, { predictedHome: 2, predictedAway: 1, predictedAdvancesTeamId: null }],
      [FINAL_MATCH_NUMBER, { predictedHome: 3, predictedAway: 1, predictedAdvancesTeamId: null }],
    ]);

    const podium = resolveTournamentPodium(
      knockoutDefs,
      teams,
      groupResults,
      ["J", "I", "H", "A", "B", "C", "D", "E"],
      predictions
    );

    expect(podium.championId).toBe(1);
    expect(podium.runnerUpId).toBe(2);
    expect(podium.thirdPlaceId).toBe(1);
  });
});

describe("rankThirdPlaceTeams", () => {
  it("orders third place teams by points", () => {
    const standings = [
      {
        group: "A",
        positions: [
          standingRow({ rank: 1, teamId: 1, fifaCode: "MEX", played: 3, won: 3, drawn: 0, lost: 0, gf: 6, gc: 0, gd: 6, pts: 9 }),
          standingRow({ rank: 2, teamId: 3, fifaCode: "KOR", played: 3, won: 1, drawn: 1, lost: 1, gf: 3, gc: 3, gd: 0, pts: 4 }),
          standingRow({ rank: 3, teamId: 4, fifaCode: "CZE", played: 3, won: 1, drawn: 0, lost: 2, gf: 2, gc: 4, gd: -2, pts: 3 }),
          standingRow({ rank: 4, teamId: 2, fifaCode: "RSA", played: 3, won: 0, drawn: 1, lost: 2, gf: 1, gc: 5, gd: -4, pts: 1 }),
        ],
      },
      {
        group: "B",
        positions: [
          standingRow({ rank: 1, teamId: 5, fifaCode: "CAN", played: 3, won: 2, drawn: 1, lost: 0, gf: 5, gc: 1, gd: 4, pts: 7 }),
          standingRow({ rank: 2, teamId: 8, fifaCode: "SUI", played: 3, won: 2, drawn: 0, lost: 1, gf: 4, gc: 2, gd: 2, pts: 6 }),
          standingRow({ rank: 3, teamId: 7, fifaCode: "QAT", played: 3, won: 1, drawn: 0, lost: 2, gf: 2, gc: 5, gd: -3, pts: 3 }),
          standingRow({ rank: 4, teamId: 6, fifaCode: "BIH", played: 3, won: 0, drawn: 1, lost: 2, gf: 1, gc: 4, gd: -3, pts: 1 }),
        ],
      },
    ];

    const ranked = rankThirdPlaceTeams(standings, ["A", "B"]);
    expect(ranked[0].teamId).toBe(4);
    expect(ranked[1].teamId).toBe(7);
  });
});

describe("FIFA 2026 knockout fixture matrix", () => {
  function sourceKey(source: unknown): string {
    const slot = source as {
      type: string;
      group?: string;
      rank?: number;
      eligible_groups?: string[];
      match_number?: number;
    };
    if (slot.type === "group_rank") return `${slot.rank}${slot.group}`;
    if (slot.type === "third_best") return `3${slot.eligible_groups?.join("")}`;
    if (slot.type === "match_winner") return `W${slot.match_number}`;
    if (slot.type === "match_loser") return `L${slot.match_number}`;
    return "unknown";
  }

  it("keeps M73-M104 aligned with the official bracket source matrix", () => {
    const expected: Record<number, [string, string]> = {
      73: ["2A", "2B"],
      74: ["1E", "3ABCDF"],
      75: ["1F", "2C"],
      76: ["1C", "2F"],
      77: ["1I", "3CDFGH"],
      78: ["2E", "2I"],
      79: ["1A", "3CEFHI"],
      80: ["1L", "3EHIJK"],
      81: ["1D", "3BEFIJ"],
      82: ["1G", "3AEHIJ"],
      83: ["2K", "2L"],
      84: ["1H", "2J"],
      85: ["1B", "3EFGIJ"],
      86: ["1J", "2H"],
      87: ["1K", "3DEIJL"],
      88: ["2D", "2G"],
      89: ["W74", "W77"],
      90: ["W73", "W75"],
      91: ["W76", "W78"],
      92: ["W79", "W80"],
      93: ["W83", "W84"],
      94: ["W81", "W82"],
      95: ["W86", "W88"],
      96: ["W85", "W87"],
      97: ["W89", "W90"],
      98: ["W93", "W94"],
      99: ["W91", "W92"],
      100: ["W95", "W96"],
      101: ["W97", "W98"],
      102: ["W99", "W100"],
      103: ["L101", "L102"],
      104: ["W101", "W102"],
    };
    const byNumber = new Map(knockoutMatches.map((match) => [match.fifa_match_number, match]));

    expect(byNumber.size).toBe(32);
    for (const [matchNumber, [home, away]] of Object.entries(expected)) {
      const match = byNumber.get(Number(matchNumber));
      expect(match).toBeDefined();
      expect([sourceKey(match?.home_source), sourceKey(match?.away_source)]).toEqual([home, away]);
    }
  });
});
