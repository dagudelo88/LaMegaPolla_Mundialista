import { describe, expect, it } from "vitest";
import { computeGroupStanding } from "@/lib/bracket/group-standings";
import {
  resolveAllKnockoutMatches,
  resolveKnockoutMatch,
  resolveTournamentPodium,
  FINAL_MATCH_NUMBER,
  THIRD_PLACE_MATCH_NUMBER,
} from "@/lib/bracket/knockout-resolver";
import { rankThirdPlaceTeams, validateThirdPlaceSelection, computeAdvancingThirdGroups, rankAllThirdPlaceTeams } from "@/lib/bracket/third-place-advancement";
import type { GroupMatchResult, KnockoutMatchDef, MatchWinnerContext, TeamRef } from "@/lib/bracket/types";

const teamsA: TeamRef[] = [
  { id: 1, fifaCode: "MEX", groupLetter: "A" },
  { id: 2, fifaCode: "RSA", groupLetter: "A" },
  { id: 3, fifaCode: "KOR", groupLetter: "A" },
  { id: 4, fifaCode: "CZE", groupLetter: "A" },
];

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
});

describe("third place advancement", () => {
  it("requires exactly 8 groups", () => {
    expect(validateThirdPlaceSelection(["A", "B"]).valid).toBe(false);
    const eight = ["A", "B", "C", "D", "E", "F", "G", "H"];
    expect(validateThirdPlaceSelection(eight).valid).toBe(true);
  });
});

describe("resolveKnockoutMatch (official)", () => {
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
    ) => ({
      group,
      positions: [
        { rank: 1, teamId: teamId + 100, fifaCode: "X1", played: 3, won: 3, drawn: 0, lost: 0, gf: 6, gc: 0, gd: 6, pts: 9 },
        { rank: 2, teamId: teamId + 200, fifaCode: "X2", played: 3, won: 1, drawn: 1, lost: 1, gf: 3, gc: 3, gd: 0, pts: 4 },
        { rank: 3, teamId, fifaCode: code, played: 3, won: 1, drawn: 0, lost: 2, gf: thirdGf, gc: 4, gd: thirdGd, pts: thirdPts },
        { rank: 4, teamId: teamId + 300, fifaCode: "X4", played: 3, won: 0, drawn: 1, lost: 2, gf: 1, gc: 5, gd: -4, pts: 1 },
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
          { rank: 1, teamId: 1, fifaCode: "MEX", played: 3, won: 3, drawn: 0, lost: 0, gf: 6, gc: 0, gd: 6, pts: 9 },
          { rank: 2, teamId: 3, fifaCode: "KOR", played: 3, won: 1, drawn: 1, lost: 1, gf: 3, gc: 3, gd: 0, pts: 4 },
          { rank: 3, teamId: 4, fifaCode: "CZE", played: 3, won: 1, drawn: 0, lost: 2, gf: 2, gc: 4, gd: -2, pts: 3 },
          { rank: 4, teamId: 2, fifaCode: "RSA", played: 3, won: 0, drawn: 1, lost: 2, gf: 1, gc: 5, gd: -4, pts: 1 },
        ],
      },
      {
        group: "B",
        positions: [
          { rank: 1, teamId: 5, fifaCode: "CAN", played: 3, won: 2, drawn: 1, lost: 0, gf: 5, gc: 1, gd: 4, pts: 7 },
          { rank: 2, teamId: 8, fifaCode: "SUI", played: 3, won: 2, drawn: 0, lost: 1, gf: 4, gc: 2, gd: 2, pts: 6 },
          { rank: 3, teamId: 7, fifaCode: "QAT", played: 3, won: 1, drawn: 0, lost: 2, gf: 2, gc: 5, gd: -3, pts: 3 },
          { rank: 4, teamId: 6, fifaCode: "BIH", played: 3, won: 0, drawn: 1, lost: 2, gf: 1, gc: 4, gd: -3, pts: 1 },
        ],
      },
    ];

    const ranked = rankThirdPlaceTeams(standings, ["A", "B"]);
    expect(ranked[0].teamId).toBe(4);
    expect(ranked[1].teamId).toBe(7);
  });
});
