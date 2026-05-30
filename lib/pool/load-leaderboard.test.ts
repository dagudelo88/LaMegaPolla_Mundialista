import { describe, expect, it } from "vitest";
import {
  assignCompetitionRanks,
  getPodiumTies,
  sortLeaderboard,
  type LeaderboardRow,
} from "./load-leaderboard";

function row(
  username: string,
  total_points: number,
  plenos_count = 0,
  change_points_spent = 0,
  joined_at = "2026-01-01T00:00:00Z"
): LeaderboardRow {
  return {
    id: username,
    username,
    total_points,
    plenos_count,
    change_points_spent,
    joined_at,
  };
}

describe("sortLeaderboard", () => {
  it("orders by total_points descending", () => {
    const sorted = sortLeaderboard([row("b", 50), row("a", 100), row("c", 75)]);
    expect(sorted.map((r) => r.username)).toEqual(["a", "c", "b"]);
  });

  it("breaks ties by plenos_count descending", () => {
    const sorted = sortLeaderboard([
      row("a", 100, 2),
      row("b", 100, 5),
    ]);
    expect(sorted.map((r) => r.username)).toEqual(["b", "a"]);
  });

  it("breaks ties by fewer change_points_spent when points and plenos match", () => {
    const sorted = sortLeaderboard([
      row("spender", 100, 3, 12),
      row("saver", 100, 3, 3),
    ]);
    expect(sorted.map((r) => r.username)).toEqual(["saver", "spender"]);
  });

  it("uses username for stable order when fully tied on REGLAS §8 criteria", () => {
    const sorted = sortLeaderboard([
      row("zeta", 100, 3, 0),
      row("alpha", 100, 3, 0),
    ]);
    expect(sorted.map((r) => r.username)).toEqual(["alpha", "zeta"]);
  });
});

describe("assignCompetitionRanks", () => {
  it("assigns shared rank only when points, plenos and change spend match", () => {
    const ranked = assignCompetitionRanks([
      row("a", 120, 4, 0),
      row("b", 120, 4, 0),
      row("c", 110),
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it("separates ranks when points match but plenos differ", () => {
    const ranked = assignCompetitionRanks([
      row("a", 120, 5),
      row("b", 120, 3),
      row("c", 110),
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("separates ranks when points and plenos match but change spend differs", () => {
    const ranked = assignCompetitionRanks([
      row("a", 120, 4, 0),
      row("b", 120, 4, 9),
      row("c", 110),
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("assigns shared rank 2, 2, 4 when two players fully tie for second", () => {
    const ranked = assignCompetitionRanks([
      row("a", 120),
      row("b", 110, 2, 3),
      row("c", 110, 2, 3),
      row("d", 90),
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it("assigns sequential ranks when all tiebreakers differ", () => {
    const ranked = assignCompetitionRanks([
      row("a", 120),
      row("b", 110),
      row("c", 100),
      row("d", 90),
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });
});

describe("getPodiumTies", () => {
  const prizes = { firstPlace: 700_000, secondPlace: 150_000, thirdPlace: 100_000 };

  it("detects a two-way tie for first place and splits prize", () => {
    const ranked = assignCompetitionRanks([
      row("a", 120, 4, 0),
      row("b", 120, 4, 0),
      row("c", 110),
    ]);

    const ties = getPodiumTies(ranked, prizes);
    expect(ties).toHaveLength(1);
    expect(ties[0]).toMatchObject({
      rank: 1,
      usernames: ["a", "b"],
      totalPrize: 700_000,
      suggestedPerPerson: 350_000,
    });
  });

  it("returns empty when same points but tiebreakers split the podium", () => {
    const ranked = assignCompetitionRanks([
      row("a", 120, 5),
      row("b", 120, 3),
      row("c", 110),
    ]);
    expect(getPodiumTies(ranked, prizes)).toEqual([]);
  });

  it("returns empty when no podium ties exist", () => {
    const ranked = assignCompetitionRanks([
      row("a", 120),
      row("b", 110),
      row("c", 100),
    ]);
    expect(getPodiumTies(ranked, prizes)).toEqual([]);
  });
});
