import { describe, expect, it } from "vitest";
import {
  computeThirdOrderAffectedMatchNumbers,
  mapAffectedNumbersToMatchIds,
} from "./qualifier-adjustment-affected";
import type { KnockoutMatchDef, TeamRef } from "@/lib/bracket/types";

describe("computeThirdOrderAffectedMatchNumbers", () => {
  it("returns empty when third-place assignment does not change crosses", () => {
    const teams: TeamRef[] = [
      { id: 1, fifaCode: "A1", groupLetter: "A" },
      { id: 2, fifaCode: "A2", groupLetter: "A" },
    ];
    const knockoutDefs: KnockoutMatchDef[] = [
      {
        fifaMatchNumber: 73,
        phase: "round_of_32",
        homeSource: { type: "group_rank", group: "A", rank: 1 },
        awaySource: { type: "group_rank", group: "A", rank: 2 },
      },
    ];
    const groupResults = [
      { homeTeamId: 1, awayTeamId: 2, homeGoals: 1, awayGoals: 0 },
    ];
    const predictions = new Map([
      [73, { predictedHome: 2, predictedAway: 1, predictedAdvancesTeamId: null }],
    ]);

    const affected = computeThirdOrderAffectedMatchNumbers(
      knockoutDefs,
      teams,
      groupResults,
      ["B", "C", "D", "E", "F", "G", "H", "I"],
      ["B", "C", "D", "E", "F", "G", "H", "I"],
      predictions
    );

    expect(affected).toEqual([]);
  });
});

describe("mapAffectedNumbersToMatchIds", () => {
  it("maps fifa numbers to match ids", () => {
    expect(
      mapAffectedNumbersToMatchIds(
        [
          { id: "m-73", fifa_match_number: 73 },
          { id: "m-74", fifa_match_number: 74 },
        ],
        [73]
      )
    ).toEqual(["m-73"]);
  });
});
