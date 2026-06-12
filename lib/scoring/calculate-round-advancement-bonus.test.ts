import { describe, expect, it } from "vitest";
import { calculateRoundAdvancementBonus } from "@/lib/scoring/calculate-round-advancement-bonus";

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
