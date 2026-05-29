import type { SupabaseClient } from "@supabase/supabase-js";

/** total_points = earned from matches - spent on paid changes (REGLAS §5). Bonuses added later. */
export async function recalculateUserTotalPoints(
  admin: SupabaseClient,
  userId: string
): Promise<number> {
  const [{ data: earnedRows }, { data: changeRows }] = await Promise.all([
    admin.from("user_match_points").select("points").eq("user_id", userId),
    admin.from("prediction_changes").select("points_spent").eq("user_id", userId),
  ]);

  const earned = (earnedRows ?? []).reduce((sum, row) => sum + row.points, 0);
  const spent = (changeRows ?? []).reduce((sum, row) => sum + row.points_spent, 0);
  const total = earned - spent;

  const { error } = await admin
    .from("profiles")
    .update({ total_points: total, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw new Error(error.message);
  return total;
}

export async function recalculateUsersTotalPoints(
  admin: SupabaseClient,
  userIds: string[]
): Promise<void> {
  const unique = [...new Set(userIds)];
  for (const userId of unique) {
    await recalculateUserTotalPoints(admin, userId);
  }
}
