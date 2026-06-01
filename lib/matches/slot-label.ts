import type { BracketSlot } from "@/lib/bracket/types";

export function formatBracketSlotLabel(slot: BracketSlot): string {
  if (slot.type === "group_rank") {
    return `${slot.rank}${slot.group}`;
  }
  if (slot.type === "third_best") {
    return `3${slot.eligible_groups.join("")}`;
  }
  if (slot.type === "match_winner") {
    return `W${slot.match_number}`;
  }
  if (slot.type === "match_loser") {
    return `RU${slot.match_number}`;
  }
  return "Por definir";
}

export function parseBracketSlot(source: unknown): BracketSlot | null {
  if (!source || typeof source !== "object") return null;
  const s = source as Record<string, unknown>;
  if (s.type === "group_rank" && typeof s.group === "string" && typeof s.rank === "number") {
    return { type: "group_rank", group: s.group, rank: s.rank as 1 | 2 };
  }
  if (s.type === "third_best" && Array.isArray(s.eligible_groups)) {
    return { type: "third_best", eligible_groups: s.eligible_groups as string[] };
  }
  if (s.type === "match_winner" && typeof s.match_number === "number") {
    return { type: "match_winner", match_number: s.match_number };
  }
  if (s.type === "match_loser" && typeof s.match_number === "number") {
    return { type: "match_loser", match_number: s.match_number };
  }
  return null;
}
