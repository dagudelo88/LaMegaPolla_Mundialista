import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatMatchDateSortKey,
  formatMatchTime,
} from "@/lib/matches/format-datetime";

const dataDir = resolve(process.cwd(), "data/fifa-2026");

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(resolve(dataDir, file), "utf8")) as T;
}

type KickoffRef = { fifa_match_number: number; kickoff_at: string };
type GroupMatch = KickoffRef & { home_code: string; away_code: string };
type KnockoutMatch = KickoffRef;

describe("FIFA 2026 kickoffs", () => {
  const official = loadJson<KickoffRef[]>("official-kickoffs-utc.json");
  const group = loadJson<GroupMatch[]>("group-matches.json");
  const knockout = loadJson<KnockoutMatch[]>("knockout-matches.json");

  it("has 104 official kickoff entries", () => {
    expect(official).toHaveLength(104);
  });

  it("group and knockout JSON match official-kickoffs-utc.json", () => {
    const generated = [...group, ...knockout].sort(
      (a, b) => a.fifa_match_number - b.fifa_match_number
    );
    expect(generated).toHaveLength(104);
    for (const ref of official) {
      const match = generated.find((m) => m.fifa_match_number === ref.fifa_match_number);
      expect(match?.kickoff_at, `match ${ref.fifa_match_number}`).toBe(ref.kickoff_at);
    }
  });

  it("opening match MEX–RSA: 14:00 hora Colombia on 2026-06-11", () => {
    const m1 = official.find((m) => m.fifa_match_number === 1)!;
    expect(m1.kickoff_at).toBe("2026-06-11T19:00:00Z");
    expect(formatMatchTime(m1.kickoff_at)).toBe("14:00");
    expect(formatMatchDateSortKey(m1.kickoff_at)).toBe("2026-06-11");
  });

  it("Colombia group matches match FIFA venue-local → Colombia display", () => {
    const m24 = official.find((m) => m.fifa_match_number === 24)!;
    expect(m24.kickoff_at).toBe("2026-06-18T02:00:00Z");
    expect(formatMatchTime(m24.kickoff_at)).toBe("21:00");
    expect(formatMatchDateSortKey(m24.kickoff_at)).toBe("2026-06-17");

    const m48 = official.find((m) => m.fifa_match_number === 48)!;
    expect(m48.kickoff_at).toBe("2026-06-24T02:00:00Z");
    expect(formatMatchTime(m48.kickoff_at)).toBe("21:00");
    expect(formatMatchDateSortKey(m48.kickoff_at)).toBe("2026-06-23");

    const m71 = official.find((m) => m.fifa_match_number === 71)!;
    expect(m71.kickoff_at).toBe("2026-06-27T23:30:00Z");
    expect(formatMatchTime(m71.kickoff_at)).toBe("18:30");
    expect(formatMatchDateSortKey(m71.kickoff_at)).toBe("2026-06-27");
  });

  it("AUS–TUR (M6) Vancouver evening → correct Colombia date", () => {
    const m6 = official.find((m) => m.fifa_match_number === 6)!;
    expect(m6.kickoff_at).toBe("2026-06-14T04:00:00Z");
    expect(formatMatchTime(m6.kickoff_at)).toBe("23:00");
    expect(formatMatchDateSortKey(m6.kickoff_at)).toBe("2026-06-13");
  });
});
