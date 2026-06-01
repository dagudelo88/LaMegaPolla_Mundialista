import { describe, expect, it } from "vitest";
import { formatBracketSlotLabel } from "@/lib/matches/slot-label";

describe("formatBracketSlotLabel", () => {
  it("uses FIFA fixture nomenclature for knockout placeholders", () => {
    expect(formatBracketSlotLabel({ type: "group_rank", group: "A", rank: 2 })).toBe("2A");
    expect(
      formatBracketSlotLabel({
        type: "third_best",
        eligible_groups: ["A", "B", "C", "D", "F"],
      })
    ).toBe("3ABCDF");
    expect(formatBracketSlotLabel({ type: "match_winner", match_number: 73 })).toBe("W73");
    expect(formatBracketSlotLabel({ type: "match_loser", match_number: 101 })).toBe("RU101");
  });
});

