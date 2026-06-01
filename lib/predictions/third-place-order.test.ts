import { describe, expect, it } from "vitest";
import {
  advancingThirdGroupsFromRanked,
  thirdPlaceOrderDiffers,
  type ThirdPlaceTeamInput,
} from "./third-place-order";
import type { RankedThirdPlace } from "@/lib/bracket/third-place-advancement";

function rankedEntry(
  group: string,
  rankAmongThirds: number,
  advances: boolean
): RankedThirdPlace {
  return {
    group,
    rankAmongThirds,
    advances,
    row: {
      rank: 3,
      teamId: 1,
      fifaCode: group,
      played: 3,
      won: 0,
      drawn: 3,
      lost: 0,
      pts: 3,
      gd: 0,
      gf: 2,
      gc: 2,
      teamConductScore: 0,
      fifaRanking: 50,
      manualTieBreakRank: null,
    },
  };
}

describe("thirdPlaceOrderDiffers", () => {
  it("returns false when order and advancing set match", () => {
    const official = [
      rankedEntry("A", 1, true),
      rankedEntry("B", 2, true),
      rankedEntry("C", 3, false),
    ];
    const predicted = [
      rankedEntry("A", 1, true),
      rankedEntry("B", 2, true),
      rankedEntry("C", 3, false),
    ];
    expect(thirdPlaceOrderDiffers(official, predicted)).toBe(false);
  });

  it("returns true when rank among thirds changes", () => {
    const official = [
      rankedEntry("A", 1, true),
      rankedEntry("B", 2, true),
    ];
    const predicted = [
      rankedEntry("B", 1, true),
      rankedEntry("A", 2, true),
    ];
    expect(thirdPlaceOrderDiffers(official, predicted)).toBe(true);
  });

  it("returns true when advancing third groups change", () => {
    const official = [rankedEntry("A", 1, true), rankedEntry("B", 2, false)];
    const predicted = [rankedEntry("B", 1, true), rankedEntry("A", 2, false)];
    expect(thirdPlaceOrderDiffers(official, predicted)).toBe(true);
  });
});

describe("advancingThirdGroupsFromRanked", () => {
  it("returns groups that advance", () => {
    const ranked = [
      rankedEntry("A", 1, true),
      rankedEntry("B", 2, true),
      rankedEntry("C", 3, false),
    ];
    expect(advancingThirdGroupsFromRanked(ranked)).toEqual(["A", "B"]);
  });
});

describe("ThirdPlaceTeamInput typing", () => {
  it("accepts minimal team rows", () => {
    const teams: ThirdPlaceTeamInput[] = [
      { id: 1, fifa_code: "COL", group_letter: "A" },
    ];
    expect(teams).toHaveLength(1);
  });
});
