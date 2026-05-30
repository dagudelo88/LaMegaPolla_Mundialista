import { describe, expect, it } from "vitest";
import { isActivePoolParticipant } from "./is-active-participant";

describe("isActivePoolParticipant", () => {
  it("returns true when registered, paid and not withdrawn", () => {
    expect(
      isActivePoolParticipant({
        invite_redeemed_at: "2026-01-01T00:00:00Z",
        entry_fee_paid: true,
        withdrawn_at: null,
      })
    ).toBe(true);
  });

  it("returns false when entry fee not paid", () => {
    expect(
      isActivePoolParticipant({
        invite_redeemed_at: "2026-01-01T00:00:00Z",
        entry_fee_paid: false,
        withdrawn_at: null,
      })
    ).toBe(false);
  });

  it("returns true for admin even when entry fee flag is false", () => {
    expect(
      isActivePoolParticipant({
        invite_redeemed_at: "2026-01-01T00:00:00Z",
        is_admin: true,
        entry_fee_paid: false,
        withdrawn_at: null,
      })
    ).toBe(true);
  });

  it("returns false when withdrawn", () => {
    expect(
      isActivePoolParticipant({
        invite_redeemed_at: "2026-01-01T00:00:00Z",
        entry_fee_paid: true,
        withdrawn_at: "2026-06-01T00:00:00Z",
      })
    ).toBe(false);
  });
});
