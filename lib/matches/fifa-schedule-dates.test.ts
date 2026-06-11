import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getJornadaKey, groupMatchesByJornada } from "@/lib/jornada/helpers";
import { formatFifaScheduleDateHeader } from "@/lib/matches/format-datetime";

const dataDir = resolve(process.cwd(), "data/fifa-2026");

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(resolve(dataDir, file), "utf8")) as T;
}

type MatchRow = {
  fifa_match_number: number;
  fifa_schedule_date: string;
  kickoff_at: string;
};

describe("FIFA 2026 schedule dates", () => {
  const scheduleByDay = loadJson<Record<string, number[]>>("official-fifa-schedule-by-day.json");
  const group = loadJson<MatchRow[]>("group-matches.json");
  const knockout = loadJson<MatchRow[]>("knockout-matches.json");
  const allMatches = [...group, ...knockout].sort(
    (a, b) => a.fifa_match_number - b.fifa_match_number
  );

  it("has 104 matches with fifa_schedule_date", () => {
    expect(allMatches).toHaveLength(104);
    for (const m of allMatches) {
      expect(m.fifa_schedule_date, `match ${m.fifa_match_number}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("schedule-by-day sums to 104 with no duplicates", () => {
    const allNums: number[] = [];
    for (const nums of Object.values(scheduleByDay)) {
      allNums.push(...nums);
    }
    expect(allNums).toHaveLength(104);
    expect(new Set(allNums).size).toBe(104);
    expect(allNums.sort((a, b) => a - b)).toEqual(
      allMatches.map((m) => m.fifa_match_number)
    );
  });

  it("each match fifa_schedule_date matches official schedule-by-day", () => {
    for (const m of allMatches) {
      const dayNums = scheduleByDay[m.fifa_schedule_date];
      expect(dayNums, `match ${m.fifa_match_number} on ${m.fifa_schedule_date}`).toContain(
        m.fifa_match_number
      );
    }
  });

  it("grouping by fifa_schedule_date matches reference for every day", () => {
    const refs = allMatches.map((m) => ({
      id: String(m.fifa_match_number),
      kickoff_at: m.kickoff_at,
      fifa_schedule_date: m.fifa_schedule_date,
      status: "scheduled" as const,
    }));
    const grouped = groupMatchesByJornada(refs);

    for (const [dateKey, expectedNums] of Object.entries(scheduleByDay)) {
      const dayMatches = grouped.get(dateKey) ?? [];
      const actualNums = dayMatches
        .map((m) => Number(m.id))
        .sort((a, b) => {
          const ka = allMatches.find((x) => x.fifa_match_number === a)!.kickoff_at;
          const kb = allMatches.find((x) => x.fifa_match_number === b)!.kickoff_at;
          return ka.localeCompare(kb);
        });
      expect(actualNums, dateKey).toEqual([...expectedNums].sort((a, b) => {
        const ka = allMatches.find((x) => x.fifa_match_number === a)!.kickoff_at;
        const kb = allMatches.find((x) => x.fifa_match_number === b)!.kickoff_at;
        return ka.localeCompare(kb);
      }));
    }
  });

  it("Friday 2026-06-12 has exactly M3 and M4", () => {
    expect(scheduleByDay["2026-06-12"]).toEqual([3, 4]);
  });

  it("Saturday 2026-06-13 includes M6 AUS–TUR (23:00 CO)", () => {
    expect(scheduleByDay["2026-06-13"]).toContain(6);
    const m6 = allMatches.find((m) => m.fifa_match_number === 6)!;
    expect(m6.fifa_schedule_date).toBe("2026-06-13");
    expect(getJornadaKey({ fifa_schedule_date: m6.fifa_schedule_date })).toBe("2026-06-13");
  });

  it("Sunday 2026-06-22 has M41–M44 (4 matches)", () => {
    expect(scheduleByDay["2026-06-22"]).toEqual([41, 42, 43, 44]);
  });

  it("2026-06-27 includes M71 COL–POR", () => {
    expect(scheduleByDay["2026-06-27"]).toContain(71);
    const m71 = allMatches.find((m) => m.fifa_match_number === 71)!;
    expect(m71.fifa_schedule_date).toBe("2026-06-27");
  });

  it("knockout 2026-06-29 has M74 and M76", () => {
    expect(scheduleByDay["2026-06-29"]).toEqual([74, 76]);
  });

  it("formatFifaScheduleDateHeader uses calendar date without timezone shift", () => {
    expect(formatFifaScheduleDateHeader("2026-06-12")).toMatch(/12 de junio de 2026/i);
    expect(formatFifaScheduleDateHeader("2026-06-13")).toMatch(/13 de junio de 2026/i);
  });
});
