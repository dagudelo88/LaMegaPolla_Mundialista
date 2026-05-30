import { describe, expect, it } from "vitest";
import { calculateJornadaBonus } from "@/lib/scoring/calculate-jornada-bonus";

const config = { match: 3, exact: 5 };

describe("calculateJornadaBonus", () => {
  it("awards 3 for correct match without exact goals", () => {
    expect(
      calculateJornadaBonus({
        pickedMatchId: "m2",
        winningMatchIds: ["m2"],
        isTie: false,
        predictedTotalGoals: 4,
        actualTotalGoals: 5,
        config,
      })
    ).toBe(3);
  });

  it("awards 5 for correct match with exact total goals", () => {
    expect(
      calculateJornadaBonus({
        pickedMatchId: "m2",
        winningMatchIds: ["m2"],
        isTie: false,
        predictedTotalGoals: 5,
        actualTotalGoals: 5,
        config,
      })
    ).toBe(5);
  });

  it("returns 0 for wrong match", () => {
    expect(
      calculateJornadaBonus({
        pickedMatchId: "m1",
        winningMatchIds: ["m2"],
        isTie: false,
        predictedTotalGoals: 5,
        actualTotalGoals: 5,
        config,
      })
    ).toBe(0);
  });

  it("returns 0 when jornada has tie for max goals", () => {
    expect(
      calculateJornadaBonus({
        pickedMatchId: "m2",
        winningMatchIds: ["m2", "m3"],
        isTie: true,
        predictedTotalGoals: 5,
        actualTotalGoals: 5,
        config,
      })
    ).toBe(0);
  });
});
