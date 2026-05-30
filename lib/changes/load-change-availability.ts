import { getConfigNumber } from "@/lib/config/get-config";
import { countPaidChangesToday } from "@/lib/changes/count-paid-changes-today";
import { getGlobalDeadlineIso, isGlobalDeadlinePassed } from "@/lib/predictions/global-deadline";
import { createClient } from "@/lib/supabase/server";

export interface ChangeAvailability {
  isSubmitted: boolean;
  deadlinePassed: boolean;
  paidChangesEnabled: boolean;
  maxChangesPerDay: number;
  changesUsedToday: number;
  changesRemaining: number;
  changesExhausted: boolean;
}

export async function loadChangeAvailability(userId: string): Promise<ChangeAvailability> {
  const supabase = await createClient();
  const maxChangesPerDay = await getConfigNumber("changes.max_per_day", 1);
  const globalDeadline = await getGlobalDeadlineIso();
  const deadlinePassed = isGlobalDeadlinePassed(globalDeadline);

  const [{ data: submission }, changesUsedToday] = await Promise.all([
    supabase
      .from("user_tournament_submissions")
      .select("is_complete")
      .eq("user_id", userId)
      .maybeSingle(),
    countPaidChangesToday(supabase, userId),
  ]);

  const isSubmitted = submission?.is_complete ?? false;
  const paidChangesEnabled = isSubmitted && deadlinePassed;
  const changesRemaining = paidChangesEnabled
    ? Math.max(0, maxChangesPerDay - changesUsedToday)
    : 0;

  return {
    isSubmitted,
    deadlinePassed,
    paidChangesEnabled,
    maxChangesPerDay,
    changesUsedToday,
    changesRemaining,
    changesExhausted: paidChangesEnabled && changesUsedToday >= maxChangesPerDay,
  };
}
