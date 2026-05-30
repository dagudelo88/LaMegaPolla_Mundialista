import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getGlobalDeadlineIso,
  isGlobalDeadlinePassed,
} from "@/lib/predictions/global-deadline";

/** Lock submitted predictions after global deadline; unlock before it (REGLAS §3–§5). */
export async function syncUserPredictionLockState(
  userId: string,
  now: Date = new Date()
): Promise<{ deadlinePassed: boolean; isSubmitted: boolean }> {
  const globalDeadline = await getGlobalDeadlineIso();
  const deadlinePassed = isGlobalDeadlinePassed(globalDeadline, now);

  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("user_tournament_submissions")
    .select("is_complete")
    .eq("user_id", userId)
    .maybeSingle();

  const isSubmitted = submission?.is_complete ?? false;
  if (!isSubmitted) {
    return { deadlinePassed, isSubmitted: false };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("predictions")
    .update({
      locked: deadlinePassed,
      updated_at: now.toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  return { deadlinePassed, isSubmitted: true };
}
