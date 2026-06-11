import { describe, expect, it } from "vitest";
import { computeJornadaBonusByMatchId } from "@/lib/jornada/compute-user-jornada-bonus";

describe("computeJornadaBonusByMatchId", () => {
  it("assigns bonus to predicted top scorer when jornada is settled", () => {
    const map = computeJornadaBonusByMatchId({
      matches: [
        {
          id: "m1",
          fifa_match_number: 1,
          kickoff_at: "2026-06-12T19:00:00Z",
          fifa_schedule_date: "2026-06-12",
          status: "finished",
          home_score: 1,
          away_score: 2,
        },
        {
          id: "m2",
          fifa_match_number: 2,
          kickoff_at: "2026-06-13T01:00:00Z",
          fifa_schedule_date: "2026-06-12",
          status: "finished",
          home_score: 0,
          away_score: 2,
        },
      ],
      predictions: [
        { match_id: "m1", predicted_home: 4, predicted_away: 1 },
        { match_id: "m2", predicted_home: 1, predicted_away: 0 },
      ],
      jornadaResults: [
        {
          jornada_key: "2026-06-12",
          max_total_goals: 3,
          winning_match_ids: ["m1"],
          is_tie: false,
        },
      ],
    });

    expect(map.get("m1")).toEqual({
      bonus: 3,
      isTopScorerPick: true,
      predictedTotalGoals: 5,
    });
    expect(map.has("m2")).toBe(false);
  });

  it("derives jornada result from finished matches when DB row is missing", () => {
    const map = computeJornadaBonusByMatchId({
      matches: [
        {
          id: "m1",
          fifa_match_number: 1,
          kickoff_at: "2026-06-12T19:00:00Z",
          fifa_schedule_date: "2026-06-12",
          status: "finished",
          home_score: 1,
          away_score: 2,
        },
        {
          id: "m2",
          fifa_match_number: 2,
          kickoff_at: "2026-06-13T01:00:00Z",
          fifa_schedule_date: "2026-06-12",
          status: "finished",
          home_score: 0,
          away_score: 2,
        },
      ],
      predictions: [
        { match_id: "m1", predicted_home: 4, predicted_away: 1 },
        { match_id: "m2", predicted_home: 1, predicted_away: 0 },
      ],
      jornadaResults: [],
    });

    expect(map.get("m1")?.bonus).toBe(3);
  });
});
