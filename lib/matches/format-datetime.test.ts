import { describe, expect, it } from "vitest";
import { formatAppDateTime, isParseableInstant } from "@/lib/matches/format-datetime";

describe("isParseableInstant", () => {
  it("accepts ISO timestamps", () => {
    expect(isParseableInstant("2026-06-11T19:00:00.000Z")).toBe(true);
  });

  it("rejects round keys used as ledger fallbacks", () => {
    expect(isParseableInstant("group_stage")).toBe(false);
    expect(isParseableInstant("round_of_32")).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(isParseableInstant("")).toBe(false);
  });
});

describe("formatAppDateTime", () => {
  it("formats valid instants", () => {
    expect(formatAppDateTime("2026-06-11T19:00:00.000Z")).toMatch(/2026/);
  });
});
