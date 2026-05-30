import { getConfigNumber } from "@/lib/config/get-config";
import { countPaidChangesToday } from "@/lib/changes/count-paid-changes-today";
import { createClient } from "@/lib/supabase/server";

export interface ChangeAvailability {
  isSubmitted: boolean;
  maxChangesPerDay: number;
  changesUsedToday: number;
  changesRemaining: number;
  changesExhausted: boolean;
}

export async function loadChangeAvailability(userId: string): Promise<ChangeAvailability> {
  const supabase = await createClient();
  const maxChangesPerDay = await getConfigNumber("changes.max_per_day", 1);

  const [{ data: submission }, changesUsedToday] = await Promise.all([
    supabase
      .from("user_tournament_submissions")
      .select("is_complete")
      .eq("user_id", userId)
      .maybeSingle(),
    countPaidChangesToday(supabase, userId),
  ]);

  const changesRemaining = Math.max(0, maxChangesPerDay - changesUsedToday);

  return {
    isSubmitted: submission?.is_complete ?? false,
    maxChangesPerDay,
    changesUsedToday,
    changesRemaining,
    changesExhausted: changesUsedToday >= maxChangesPerDay,
  };
}
