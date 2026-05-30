import { describe, expect, it } from "vitest";
import { canPaidChangeMatch } from "./paid-change-eligibility";

describe("canPaidChangeMatch", () => {
  const base = {
    status: "scheduled",
    kickoff_at: "2026-06-15T20:00:00.000Z",
    prediction_deadline: "2026-06-15T19:00:00.000Z",
  };

  it("allows future scheduled matches before deadline", () => {
    const now = new Date("2026-06-14T12:00:00.000Z");
    expect(canPaidChangeMatch(base, now)).toEqual({ allowed: true });
  });

  it("blocks non-scheduled matches", () => {
    const now = new Date("2026-06-14T12:00:00.000Z");
    expect(
      canPaidChangeMatch({ ...base, status: "live" }, now)
    ).toEqual({ allowed: false, reason: "match_not_scheduled" });
  });

  it("blocks after prediction deadline", () => {
    const now = new Date("2026-06-15T20:00:00.000Z");
    expect(canPaidChangeMatch(base, now)).toEqual({
      allowed: false,
      reason: "match_locked",
    });
  });

  it("blocks matches whose kickoff is the same calendar day as now", () => {
    const now = new Date("2026-06-15T10:00:00.000Z");
    expect(canPaidChangeMatch(base, now)).toEqual({
      allowed: false,
      reason: "match_same_day",
    });
  });
});
