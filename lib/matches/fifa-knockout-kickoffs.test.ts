import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatMatchTime } from "@/lib/matches/format-datetime";

const dataDir = resolve(process.cwd(), "data/fifa-2026");

type CoEntry = { co_date: string; co_time: string };
type KnockoutMatch = {
  fifa_match_number: number;
  fifa_schedule_date: string;
  kickoff_at: string;
};

describe("FIFA 2026 knockout kickoffs (country=CO)", () => {
  const coRef = JSON.parse(
    readFileSync(resolve(dataDir, "official-knockout-co-schedule.json"), "utf8")
  ) as Record<string, CoEntry>;
  const knockout = JSON.parse(
    readFileSync(resolve(dataDir, "knockout-matches.json"), "utf8")
  ) as KnockoutMatch[];

  it("all 32 knockout matches match official CO schedule times", () => {
    expect(knockout).toHaveLength(32);
    for (const m of knockout) {
      const ref = coRef[String(m.fifa_match_number)];
      expect(ref, `M${m.fifa_match_number} ref`).toBeDefined();
      expect(m.fifa_schedule_date).toBe(ref.co_date);
      expect(formatMatchTime(m.kickoff_at)).toBe(ref.co_time);
    }
  });

  it("round of 32 Jun 28–30 matches FIFA calendar grouping", () => {
    const scheduleByDay = JSON.parse(
      readFileSync(resolve(dataDir, "official-fifa-schedule-by-day.json"), "utf8")
    ) as Record<string, number[]>;
    expect(scheduleByDay["2026-06-28"]).toEqual([73]);
    expect(scheduleByDay["2026-06-29"]).toEqual([74, 75]);
    expect(scheduleByDay["2026-06-30"]).toEqual([76, 77, 78]);
  });

  it("M73 2A–2B is 19:00 hora Colombia on 2026-06-28", () => {
    const m73 = knockout.find((m) => m.fifa_match_number === 73)!;
    expect(m73.fifa_schedule_date).toBe("2026-06-28");
    expect(formatMatchTime(m73.kickoff_at)).toBe("19:00");
  });

  it("Mon 29 Jun has M74 (17:00) and M75 (20:30); M76 is Tue 30 Jun 01:00", () => {
    const m74 = knockout.find((m) => m.fifa_match_number === 74)!;
    const m75 = knockout.find((m) => m.fifa_match_number === 75)!;
    const m76 = knockout.find((m) => m.fifa_match_number === 76)!;
    expect(m74.fifa_schedule_date).toBe("2026-06-29");
    expect(formatMatchTime(m74.kickoff_at)).toBe("17:00");
    expect(m75.fifa_schedule_date).toBe("2026-06-29");
    expect(formatMatchTime(m75.kickoff_at)).toBe("20:30");
    expect(m76.fifa_schedule_date).toBe("2026-06-30");
    expect(formatMatchTime(m76.kickoff_at)).toBe("01:00");
  });
});
