import { describe, expect, it } from "vitest";
import {
  computePredictionDeadline,
  parseDeadlineOffsetMinutes,
} from "@/lib/matches/compute-prediction-deadline";
import {
  isValidScheduleDate,
  isValidScheduleTime,
} from "@/lib/matches/validate-schedule-input";
import { bogotaLocalToUtc, utcToBogotaLocal } from "@/lib/matches/venue-timezone";

describe("computePredictionDeadline", () => {
  it("subtracts offset minutes from kickoff", () => {
    const kickoff = new Date("2026-06-11T19:00:00.000Z");
    const deadline = computePredictionDeadline(kickoff, 60);
    expect(deadline.toISOString()).toBe("2026-06-11T18:00:00.000Z");
  });

  it("defaults invalid offset to 60 minutes", () => {
    const kickoff = new Date("2026-06-11T19:00:00.000Z");
    expect(parseDeadlineOffsetMinutes("not-a-number")).toBe(60);
    expect(computePredictionDeadline(kickoff, -5).toISOString()).toBe(
      "2026-06-11T18:00:00.000Z"
    );
  });
});

describe("Bogota local ↔ UTC", () => {
  it("roundtrips civil Colombia time", () => {
    const iso = bogotaLocalToUtc("2026-06-28", "14:00");
    expect(utcToBogotaLocal(iso)).toEqual({
      localDate: "2026-06-28",
      localTime: "14:00",
    });
  });

  it("converts opening match M1 to expected UTC", () => {
    const iso = bogotaLocalToUtc("2026-06-11", "14:00");
    expect(iso).toBe("2026-06-11T19:00:00Z");
  });
});

describe("validateScheduleInput", () => {
  it("accepts valid date and time", () => {
    expect(isValidScheduleDate("2026-06-28")).toBe(true);
    expect(isValidScheduleTime("14:00")).toBe(true);
    expect(isValidScheduleTime("09:30")).toBe(true);
  });

  it("rejects invalid date and time", () => {
    expect(isValidScheduleDate("2026-13-01")).toBe(false);
    expect(isValidScheduleDate("28-06-2026")).toBe(false);
    expect(isValidScheduleTime("25:00")).toBe(false);
    expect(isValidScheduleTime("14:60")).toBe(false);
  });
});
