import { getConfig } from "@/lib/config/get-config";
import { DEFAULT_GLOBAL_DEADLINE } from "@/lib/config/tournament-deadline";

export async function getGlobalDeadlineIso(): Promise<string> {
  return (await getConfig<string>("tournament.global_deadline")) ?? DEFAULT_GLOBAL_DEADLINE;
}

export function isGlobalDeadlinePassed(
  deadlineIso: string,
  now: Date = new Date()
): boolean {
  return now >= new Date(deadlineIso);
}

/** Player-specific extension after the tournament global deadline (admin-granted). */
export function isLateSubmissionWindowOpen(
  lateSubmissionUntil: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!lateSubmissionUntil) return false;
  return now < new Date(lateSubmissionUntil);
}

export function isPredictionEditingClosed(
  globalDeadlineIso: string,
  lateSubmissionUntil: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (isLateSubmissionWindowOpen(lateSubmissionUntil, now)) return false;
  return isGlobalDeadlinePassed(globalDeadlineIso, now);
}
