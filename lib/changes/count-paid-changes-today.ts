import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppDayUtcBounds, getTournamentTodayKey } from "@/lib/changes/tournament-today";

/** Count paid changes made on the current app calendar day (Colombia), using created_at. */
export async function countPaidChangesToday(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date()
): Promise<number> {
  const { start, end } = getAppDayUtcBounds(now);

  const { count, error } = await supabase
    .from("prediction_changes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gt("points_spent", 0)
    .gte("created_at", start)
    .lt("created_at", end);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export { getTournamentTodayKey };
