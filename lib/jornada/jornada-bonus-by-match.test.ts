import { describe, expect, it } from "vitest";
import { jornadaBonusByMatchId } from "@/lib/jornada/jornada-bonus-by-match";

describe("jornadaBonusByMatchId", () => {
  it("maps bonus points to picked match id", () => {
    const map = jornadaBonusByMatchId([
      {
        points: 3,
        breakdown: { pickedMatchId: "match-a" },
      },
      {
        points: 5,
        breakdown: { pickedMatchId: "match-b" },
      },
    ]);
    expect(map.get("match-a")).toBe(3);
    expect(map.get("match-b")).toBe(5);
  });

  it("ignores zero-point rows", () => {
    const map = jornadaBonusByMatchId([
      { points: 0, breakdown: { pickedMatchId: "match-a" } },
    ]);
    expect(map.size).toBe(0);
  });
});
