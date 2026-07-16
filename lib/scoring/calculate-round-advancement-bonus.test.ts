import { describe, expect, it } from "vitest";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import {
  calculateRoundAdvancementBonus,
  teamsForRoundComparison,
} from "@/lib/scoring/calculate-round-advancement-bonus";
import { shouldSkipEmptyUserRoundBonus } from "@/lib/scoring/process-round-advancement-bonus";

describe("calculateRoundAdvancementBonus", () => {
  it("counts +2 per correctly predicted team in next round", () => {
    const result = calculateRoundAdvancementBonus(
      [1, 2, 3, 4],
      [1, 2, 5, 6],
      2
    );
    expect(result.points).toBe(4);
    expect(result.correctTeamIds).toEqual([1, 2]);
    expect(result.incorrectTeamIds).toEqual([3, 4]);
  });

  it("returns 0 when no teams match", () => {
    const result = calculateRoundAdvancementBonus([1, 2], [3, 4], 2);
    expect(result.points).toBe(0);
    expect(result.correctTeamIds).toEqual([]);
  });
});

describe("teamsForRoundComparison semi_final", () => {
  it("unions final and third_place teams (max 8 pts at +2 each)", () => {
    const userTeamsByPhase = new Map<MatchPhase, Set<number>>([
      ["final", new Set([29, 37])],
      ["third_place", new Set([33, 45])],
    ]);
    const officialTeamsByPhase = new Map<MatchPhase, Set<number>>([
      ["final", new Set([29, 37])],
      ["third_place", new Set([33, 45])],
    ]);

    const { userTeamIds, officialTeamIds } = teamsForRoundComparison(
      "semi_final",
      "final",
      userTeamsByPhase,
      officialTeamsByPhase
    );

    expect(new Set(userTeamIds)).toEqual(new Set([29, 37, 33, 45]));
    expect(new Set(officialTeamIds)).toEqual(new Set([29, 37, 33, 45]));

    const result = calculateRoundAdvancementBonus(userTeamIds, officialTeamIds, 2);
    expect(result.points).toBe(8);
  });

  it("awards +4 when two of four official post-semi teams match", () => {
    const userTeamsByPhase = new Map<MatchPhase, Set<number>>([
      ["final", new Set([29, 17])],
      ["third_place", new Set([9, 37])],
    ]);
    const officialTeamsByPhase = new Map<MatchPhase, Set<number>>([
      ["final", new Set([29, 37])],
      ["third_place", new Set([33, 45])],
    ]);

    const { userTeamIds, officialTeamIds } = teamsForRoundComparison(
      "semi_final",
      "final",
      userTeamsByPhase,
      officialTeamsByPhase
    );
    const result = calculateRoundAdvancementBonus(userTeamIds, officialTeamIds, 2);
    expect(result.points).toBe(4);
    expect(result.correctTeamIds.sort()).toEqual([29, 37]);
  });
});

describe("shouldSkipEmptyUserRoundBonus", () => {
  it("skips when official teams exist but user resolved none", () => {
    expect(shouldSkipEmptyUserRoundBonus([], [29, 37, 33, 45])).toBe(true);
  });

  it("does not skip when user has teams (even if all wrong)", () => {
    expect(shouldSkipEmptyUserRoundBonus([1, 2, 3, 4], [29, 37, 33, 45])).toBe(false);
  });

  it("does not skip when official set is empty", () => {
    expect(shouldSkipEmptyUserRoundBonus([], [])).toBe(false);
  });
});
