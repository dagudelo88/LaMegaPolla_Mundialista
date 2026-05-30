import { describe, expect, it } from "vitest";
import {
  getAppDayUtcBounds,
  getTournamentDateKeyFromIso,
  getTournamentTodayKey,
} from "./tournament-today";

describe("getTournamentTodayKey", () => {
  it("uses America/Bogota for calendar date", () => {
    // 2026-05-30 04:00 UTC = still 2026-05-29 evening in Colombia (UTC-5)
    const utcLate = new Date("2026-05-30T04:00:00.000Z");
    expect(getTournamentTodayKey(utcLate)).toBe("2026-05-29");
  });

  it("maps created_at to app date for change_date storage", () => {
    // 19:26 on May 29 in Colombia = May 30 00:26 UTC
    expect(getTournamentDateKeyFromIso("2026-05-30T00:26:00.000Z")).toBe("2026-05-29");
  });
});

describe("getAppDayUtcBounds", () => {
  it("returns UTC range for Colombia calendar day", () => {
    const now = new Date("2026-05-30T15:00:00.000Z"); // May 30 in Colombia
    const { start, end } = getAppDayUtcBounds(now);
    expect(start).toBe("2026-05-30T05:00:00.000Z");
    expect(end).toBe("2026-05-31T05:00:00.000Z");
  });

  it("excludes yesterday evening change from today's count window", () => {
    const changeAt = "2026-05-30T00:26:00.000Z"; // May 29 19:26 Colombia
    const now = new Date("2026-05-30T15:00:00.000Z"); // May 30 in Colombia
    const { start } = getAppDayUtcBounds(now);
    expect(changeAt < start).toBe(true);
  });
});
