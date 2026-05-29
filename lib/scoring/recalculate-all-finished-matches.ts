import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { processMatchResult } from "@/lib/scoring/process-match-result";

export async function recalculateAllFinishedMatches(
  admin: SupabaseClient
): Promise<{ matchesProcessed: number; scoringPasses: number }> {
  const { data: matches, error } = await admin
    .from("matches")
    .select("id, phase, home_score, away_score")
    .eq("status", "finished")
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .order("fifa_match_number");

  if (error) throw new Error(error.message);

  let scoringPasses = 0;
  for (const match of matches ?? []) {
    const { usersScored } = await processMatchResult(admin, {
      matchId: match.id,
      phase: match.phase as MatchPhase,
      homeScore: match.home_score!,
      awayScore: match.away_score!,
    });
    scoringPasses += usersScored;
  }

  return { matchesProcessed: matches?.length ?? 0, scoringPasses };
}

/** Dev/backfill: lock predictions + mark submission for active users who have picks. */
export async function backfillLockedSubmissions(admin: SupabaseClient): Promise<number> {
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id")
    .not("invite_redeemed_at", "is", null);

  if (error) throw new Error(error.message);

  const now = new Date().toISOString();
  let updated = 0;

  for (const profile of profiles ?? []) {
    const { count } = await admin
      .from("predictions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id);

    if (!count || count === 0) continue;

    const { error: lockErr } = await admin
      .from("predictions")
      .update({ locked: true, updated_at: now })
      .eq("user_id", profile.id);

    if (lockErr) throw new Error(lockErr.message);

    const { error: subErr } = await admin.from("user_tournament_submissions").upsert(
      {
        user_id: profile.id,
        is_complete: true,
        submitted_at: now,
      },
      { onConflict: "user_id" }
    );

    if (subErr) throw new Error(subErr.message);
    updated += 1;
  }

  return updated;
}
