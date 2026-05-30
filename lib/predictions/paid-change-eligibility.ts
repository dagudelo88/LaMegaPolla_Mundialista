import { formatMatchDateSortKey } from "@/lib/matches/format-datetime";

export type PaidChangeBlockReason =
  | "match_not_scheduled"
  | "match_locked"
  | "match_same_day";

export interface PaidChangeMatchInput {
  status: string;
  kickoff_at: string;
  prediction_deadline: string;
}

export function canPaidChangeMatch(
  match: PaidChangeMatchInput,
  now: Date = new Date()
): { allowed: boolean; reason?: PaidChangeBlockReason } {
  if (match.status !== "scheduled") {
    return { allowed: false, reason: "match_not_scheduled" };
  }

  if (now > new Date(match.prediction_deadline)) {
    return { allowed: false, reason: "match_locked" };
  }

  const todayKey = formatMatchDateSortKey(now.toISOString());
  const kickoffKey = formatMatchDateSortKey(match.kickoff_at);
  if (kickoffKey === todayKey) {
    return { allowed: false, reason: "match_same_day" };
  }

  return { allowed: true };
}
