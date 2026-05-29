import { describe, expect, it } from "vitest";
import { computePredictionSummary } from "@/lib/predictions/helpers";

describe("computePredictionSummary", () => {
  it("totals goals, draws and results", () => {
    const matches = [
      { id: "g1", phase: "group_stage" },
      { id: "g2", phase: "group_stage" },
      { id: "k1", phase: "round_of_32" },
    ];
    const predictions = [
      { match_id: "g1", predicted_home: 2, predicted_away: 2, predicted_is_draw: true, predicted_advances_team_id: null, locked: false, id: "1" },
      { match_id: "g2", predicted_home: 3, predicted_away: 1, predicted_is_draw: false, predicted_advances_team_id: null, locked: false, id: "2" },
      { match_id: "k1", predicted_home: 1, predicted_away: 0, predicted_is_draw: false, predicted_advances_team_id: null, locked: false, id: "3" },
    ];

    const stats = computePredictionSummary(matches, predictions);
    expect(stats.matchesPredicted).toBe(3);
    expect(stats.totalGoals).toBe(9);
    expect(stats.draws).toBe(1);
    expect(stats.homeWins).toBe(2);
    expect(stats.awayWins).toBe(0);
    expect(stats.groupGoals).toBe(8);
    expect(stats.knockoutGoals).toBe(1);
    expect(stats.groupDraws).toBe(1);
    expect(stats.knockoutDraws).toBe(0);
    expect(stats.avgGoalsPerMatch).toBe(3);
  });
});
