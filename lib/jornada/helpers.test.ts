import { describe, expect, it } from "vitest";
import {
  getJornadaKey,
  groupMatchesByJornada,
  isJornadaEligible,
  isJornadaPickOpen,
  resolveJornadaWinners,
} from "@/lib/jornada/helpers";

describe("jornada helpers", () => {
  it("groups matches by Colombia calendar day", () => {
    const matches = [
      { id: "a", kickoff_at: "2026-06-12T19:00:00Z", status: "scheduled" },
      { id: "b", kickoff_at: "2026-06-13T01:00:00Z", status: "scheduled" },
      { id: "c", kickoff_at: "2026-06-13T19:00:00Z", status: "scheduled" },
    ];

    const grouped = groupMatchesByJornada(matches);
    expect(getJornadaKey("2026-06-12T19:00:00Z")).toBe("2026-06-12");
    expect(grouped.get("2026-06-12")?.map((m) => m.id)).toEqual(["a", "b"]);
    expect(grouped.get("2026-06-13")?.map((m) => m.id)).toEqual(["c"]);
  });

  it("requires at least 2 matches for eligibility", () => {
    expect(isJornadaEligible([])).toBe(false);
    expect(isJornadaEligible([{ id: "a", kickoff_at: "", status: "scheduled" }])).toBe(false);
    expect(
      isJornadaEligible([
        { id: "a", kickoff_at: "", status: "scheduled" },
        { id: "b", kickoff_at: "", status: "scheduled" },
      ])
    ).toBe(true);
  });

  it("closes picks after first kickoff", () => {
    const matches = [
      { id: "a", kickoff_at: "2026-06-12T19:00:00Z", status: "scheduled" },
      { id: "b", kickoff_at: "2026-06-13T01:00:00Z", status: "scheduled" },
    ];
    expect(isJornadaPickOpen(matches, new Date("2026-06-12T18:59:59Z"))).toBe(true);
    expect(isJornadaPickOpen(matches, new Date("2026-06-12T19:00:00Z"))).toBe(false);
  });

  it("marks tie when multiple matches share max goals", () => {
    const result = resolveJornadaWinners([
      { id: "m1", totalGoals: 4 },
      { id: "m2", totalGoals: 5 },
      { id: "m3", totalGoals: 5 },
    ]);
    expect(result.maxTotalGoals).toBe(5);
    expect(result.isTie).toBe(true);
    expect(result.winningMatchIds).toEqual(["m2", "m3"]);
  });

  it("returns single winner when no tie", () => {
    const result = resolveJornadaWinners([
      { id: "m1", totalGoals: 3 },
      { id: "m2", totalGoals: 5 },
    ]);
    expect(result.isTie).toBe(false);
    expect(result.winningMatchIds).toEqual(["m2"]);
  });
});
