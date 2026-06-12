import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { syncUserPredictionLockStateWithAdmin } from "@/lib/predictions/prediction-lock-sync";

/** Lock submitted predictions after global deadline; unlock before it (REGLAS §3–§5). */
export async function syncUserPredictionLockState(
  userId: string,
  now: Date = new Date()
): Promise<{ deadlinePassed: boolean; isSubmitted: boolean }> {
  const admin = createAdminClient();
  const result = await syncUserPredictionLockStateWithAdmin(admin, userId, now);
  return { deadlinePassed: result.deadlinePassed, isSubmitted: result.isSubmitted };
}
