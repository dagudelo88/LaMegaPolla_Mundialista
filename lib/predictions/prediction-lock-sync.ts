import type { SupabaseClient } from "@supabase/supabase-js";
import { backfillMissedMatchPointsForUser } from "@/lib/scoring/backfill-missed-match-points";
import {
  getGlobalDeadlineIso,
  isGlobalDeadlinePassed,
} from "@/lib/predictions/global-deadline";

export interface SyncUserLockResult {
  deadlinePassed: boolean;
  isSubmitted: boolean;
  backfilledMatches: number;
}

/** Lock all submitted predictions when global deadline has passed. */
export async function syncAllSubmittedPredictionLocks(
  admin: SupabaseClient,
  now: Date = new Date()
): Promise<number> {
  const globalDeadline = await getGlobalDeadlineIso();
  if (!isGlobalDeadlinePassed(globalDeadline, now)) return 0;

  const { data: submissions, error: subErr } = await admin
    .from("user_tournament_submissions")
    .select("user_id")
    .eq("is_complete", true);

  if (subErr) throw new Error(subErr.message);

  const userIds = [...new Set((submissions ?? []).map((s) => s.user_id))];
  if (!userIds.length) return 0;

  const updatedAt = now.toISOString();
  let updatedUsers = 0;

  for (const userId of userIds) {
    const { error } = await admin
      .from("predictions")
      .update({ locked: true, updated_at: updatedAt })
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
    updatedUsers += 1;
  }

  return updatedUsers;
}

/** Per-user lock sync + catch-up scoring for finished matches (admin client). */
export async function syncUserPredictionLockStateWithAdmin(
  admin: SupabaseClient,
  userId: string,
  now: Date = new Date()
): Promise<SyncUserLockResult> {
  const globalDeadline = await getGlobalDeadlineIso();
  const deadlinePassed = isGlobalDeadlinePassed(globalDeadline, now);

  const { data: submission, error: subErr } = await admin
    .from("user_tournament_submissions")
    .select("is_complete")
    .eq("user_id", userId)
    .maybeSingle();

  if (subErr) throw new Error(subErr.message);

  const isSubmitted = submission?.is_complete ?? false;
  if (!isSubmitted) {
    return { deadlinePassed, isSubmitted: false, backfilledMatches: 0 };
  }

  const { error: lockErr } = await admin
    .from("predictions")
    .update({
      locked: deadlinePassed,
      updated_at: now.toISOString(),
    })
    .eq("user_id", userId);

  if (lockErr) throw new Error(lockErr.message);

  let backfilledMatches = 0;
  if (deadlinePassed) {
    backfilledMatches = await backfillMissedMatchPointsForUser(admin, userId);
  }

  return { deadlinePassed, isSubmitted: true, backfilledMatches };
}
