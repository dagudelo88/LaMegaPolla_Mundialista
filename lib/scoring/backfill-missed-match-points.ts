import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { recalculateUserMatchPoints } from "@/lib/scoring/process-user-match-points";
import { recalculateUserTotalPoints } from "@/lib/scoring/recalculate-total-points";

/** Backfill user_match_points for finished matches the user predicted but was never scored. */
export async function backfillMissedMatchPointsForUser(
  admin: SupabaseClient,
  userId: string
): Promise<number> {
  const [{ data: finishedMatches }, { data: predictions }, { data: existingPoints }] =
    await Promise.all([
      admin
        .from("matches")
        .select("id, phase, home_score, away_score")
        .eq("status", "finished")
        .not("home_score", "is", null)
        .not("away_score", "is", null),
      admin.from("predictions").select("match_id").eq("user_id", userId),
      admin.from("user_match_points").select("match_id").eq("user_id", userId),
    ]);

  const predMatchIds = new Set((predictions ?? []).map((p) => p.match_id));
  const scoredMatchIds = new Set((existingPoints ?? []).map((p) => p.match_id));

  let backfilled = 0;
  for (const match of finishedMatches ?? []) {
    if (!predMatchIds.has(match.id) || scoredMatchIds.has(match.id)) continue;

    await recalculateUserMatchPoints(admin, {
      userId,
      matchId: match.id,
      phase: match.phase as MatchPhase,
      homeScore: match.home_score!,
      awayScore: match.away_score!,
    });
    backfilled += 1;
  }

  if (backfilled > 0) {
    await recalculateUserTotalPoints(admin, userId);
  }

  return backfilled;
}
