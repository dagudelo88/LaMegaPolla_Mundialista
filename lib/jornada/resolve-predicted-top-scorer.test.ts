import { describe, expect, it } from "vitest";
import { resolveUserPredictedTopScorer } from "@/lib/jornada/resolve-predicted-top-scorer";

describe("resolveUserPredictedTopScorer", () => {
  it("picks match with highest predicted total goals", () => {
    expect(
      resolveUserPredictedTopScorer([
        { matchId: "a", fifaMatchNumber: 1, predictedTotalGoals: 3 },
        { matchId: "b", fifaMatchNumber: 2, predictedTotalGoals: 5 },
      ])
    ).toEqual({ matchId: "b", predictedTotalGoals: 5 });
  });

  it("breaks ties by lowest FIFA match number", () => {
    expect(
      resolveUserPredictedTopScorer([
        { matchId: "b", fifaMatchNumber: 5, predictedTotalGoals: 4 },
        { matchId: "a", fifaMatchNumber: 2, predictedTotalGoals: 4 },
      ])
    ).toEqual({ matchId: "a", predictedTotalGoals: 4 });
  });

  it("returns null when no predictions", () => {
    expect(resolveUserPredictedTopScorer([])).toBeNull();
  });
});
