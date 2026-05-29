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
  joined_at = "2026-01-01T00:00:00Z"
): LeaderboardRow {
  return { username, total_points, plenos_count, joined_at };
}

describe("sortLeaderboard", () => {
  it("orders by total_points descending", () => {
    const sorted = sortLeaderboard([row("b", 50), row("a", 100), row("c", 75)]);
    expect(sorted.map((r) => r.username)).toEqual(["a", "c", "b"]);
  });

  it("breaks ties by plenos_count descending", () => {
    const sorted = sortLeaderboard([
      row("a", 100, 2, "2026-01-02T00:00:00Z"),
      row("b", 100, 5, "2026-01-01T00:00:00Z"),
    ]);
    expect(sorted.map((r) => r.username)).toEqual(["b", "a"]);
  });

  it("breaks ties by joined_at ascending when points and plenos match", () => {
    const sorted = sortLeaderboard([
      row("late", 100, 3, "2026-02-01T00:00:00Z"),
      row("early", 100, 3, "2026-01-01T00:00:00Z"),
    ]);
    expect(sorted.map((r) => r.username)).toEqual(["early", "late"]);
  });
});

describe("assignCompetitionRanks", () => {
  it("assigns shared rank 1, 1, 3 when two players tie on points", () => {
    const ranked = assignCompetitionRanks([
      row("a", 120),
      row("b", 120),
      row("c", 110),
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it("assigns shared rank 2, 2, 4 when two players tie for second", () => {
    const ranked = assignCompetitionRanks([
      row("a", 120),
      row("b", 110),
      row("c", 110),
      row("d", 90),
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it("assigns sequential ranks when all points differ", () => {
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
      row("a", 120),
      row("b", 120),
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

  it("returns empty when no podium ties exist", () => {
    const ranked = assignCompetitionRanks([
      row("a", 120),
      row("b", 110),
      row("c", 100),
    ]);
    expect(getPodiumTies(ranked, prizes)).toEqual([]);
  });
});
