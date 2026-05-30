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
