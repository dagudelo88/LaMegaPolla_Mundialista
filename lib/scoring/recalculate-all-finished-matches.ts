import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { loadBracketContext } from "@/lib/scoring/bracket-context";
import { KNOCKOUT_PHASES } from "@/lib/scoring/knockout-phase-order";
import { loadScoringConfig } from "@/lib/scoring/load-scoring-config";
import { processMatchResult } from "@/lib/scoring/process-match-result";
import { processAllCompletedRoundAdvancementBonuses } from "@/lib/scoring/process-round-advancement-bonus";
import { loadUserBracketCache } from "@/lib/scoring/user-bracket-cache";

interface FinishedMatchRow {
  id: string;
  phase: string;
  home_score: number;
  away_score: number;
  home_team_id: number | null;
  away_team_id: number | null;
  result_advances_team_id: number | null;
}

async function recalculateFinishedMatches(
  admin: SupabaseClient,
  phases: MatchPhase[] | null,
  onProgress?: (current: number, total: number, matchId: string) => void
): Promise<{ matchesProcessed: number; scoringPasses: number }> {
  let query = admin
    .from("matches")
    .select(
      "id, phase, home_score, away_score, home_team_id, away_team_id, result_advances_team_id"
    )
    .eq("status", "finished")
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .order("fifa_match_number");

  if (phases?.length) {
    query = query.in("phase", phases);
  }

  const { data: matches, error } = await query;
  if (error) throw new Error(error.message);

  const bracketCtx = await loadBracketContext(admin);
  const [userBracketCache, config] = await Promise.all([
    loadUserBracketCache(admin, bracketCtx),
    loadScoringConfig(admin),
  ]);

  const batchOpts = { bracketCtx, userBracketCache, config, deferTotalRecalc: true };
  const rows = (matches ?? []) as FinishedMatchRow[];
  let scoringPasses = 0;

  for (let i = 0; i < rows.length; i++) {
    const match = rows[i]!;
    onProgress?.(i + 1, rows.length, match.id);

    const { usersScored } = await processMatchResult(
      admin,
      {
        matchId: match.id,
        phase: match.phase as MatchPhase,
        homeScore: match.home_score,
        awayScore: match.away_score,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        resultAdvancesTeamId: match.result_advances_team_id,
      },
      batchOpts
    );
    scoringPasses += usersScored;
  }

  if (phases == null || phases.some((p) => KNOCKOUT_PHASES.includes(p))) {
    await processAllCompletedRoundAdvancementBonuses(admin, bracketCtx);
  }

  return { matchesProcessed: rows.length, scoringPasses };
}

export async function recalculateAllFinishedMatches(
  admin: SupabaseClient,
  onProgress?: (current: number, total: number, matchId: string) => void
): Promise<{ matchesProcessed: number; scoringPasses: number }> {
  return recalculateFinishedMatches(admin, null, onProgress);
}

/** Re-score finished knockout matches only (§7 slot gate, advancement +2). */
export async function recalculateFinishedKnockoutMatches(
  admin: SupabaseClient,
  onProgress?: (current: number, total: number, matchId: string) => void
): Promise<{ matchesProcessed: number; scoringPasses: number }> {
  return recalculateFinishedMatches(admin, [...KNOCKOUT_PHASES], onProgress);
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
