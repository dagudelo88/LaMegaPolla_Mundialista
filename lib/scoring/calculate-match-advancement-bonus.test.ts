import { describe, expect, it } from "vitest";
import {
  calculateMatchAdvancementBonus,
  officialAdvancingTeamId,
  predictedAdvancingTeamId,
} from "@/lib/scoring/calculate-match-advancement-bonus";

describe("calculateMatchAdvancementBonus", () => {
  it("awards +2 when predicted winner advances in knockout", () => {
    const points = calculateMatchAdvancementBonus({
      phase: "round_of_16",
      homeTeamId: 1,
      awayTeamId: 2,
      predictedHome: 2,
      predictedAway: 1,
      predictedAdvancesTeamId: null,
      actualHome: 2,
      actualAway: 1,
      resultAdvancesTeamId: null,
    });
    expect(points).toBe(2);
  });

  it("awards +2 on correct penalty advance pick", () => {
    const points = calculateMatchAdvancementBonus({
      phase: "quarter_final",
      homeTeamId: 10,
      awayTeamId: 20,
      predictedHome: 1,
      predictedAway: 1,
      predictedAdvancesTeamId: 10,
      actualHome: 1,
      actualAway: 1,
      resultAdvancesTeamId: 10,
    });
    expect(points).toBe(2);
    expect(
      predictedAdvancingTeamId({
        homeTeamId: 10,
        awayTeamId: 20,
        predictedHome: 1,
        predictedAway: 1,
        predictedAdvancesTeamId: 10,
      })
    ).toBe(10);
    expect(
      officialAdvancingTeamId({
        homeTeamId: 10,
        awayTeamId: 20,
        actualHome: 1,
        actualAway: 1,
        resultAdvancesTeamId: 10,
      })
    ).toBe(10);
  });

  it("returns 0 for wrong advance pick", () => {
    const points = calculateMatchAdvancementBonus({
      phase: "semi_final",
      homeTeamId: 5,
      awayTeamId: 6,
      predictedHome: 0,
      predictedAway: 2,
      predictedAdvancesTeamId: null,
      actualHome: 2,
      actualAway: 0,
      resultAdvancesTeamId: null,
    });
    expect(points).toBe(0);
  });

  it("returns 0 for group stage", () => {
    expect(
      calculateMatchAdvancementBonus({
        phase: "group_stage",
        homeTeamId: 1,
        awayTeamId: 2,
        predictedHome: 1,
        predictedAway: 0,
        predictedAdvancesTeamId: null,
        actualHome: 1,
        actualAway: 0,
        resultAdvancesTeamId: null,
      })
    ).toBe(0);
  });
});
