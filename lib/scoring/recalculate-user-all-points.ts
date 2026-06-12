import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { loadBracketContext } from "@/lib/scoring/bracket-context";
import { processMatchAdvancementBonus } from "@/lib/scoring/process-match-advancement-bonus";
import { processCompletedRoundAdvancementBonuses } from "@/lib/scoring/process-completed-rounds";
import { processMatchResult } from "@/lib/scoring/process-match-result";
import { recalculateUserTotalPoints } from "@/lib/scoring/recalculate-total-points";
import { recalculateAllJornadaBonuses } from "@/lib/scoring/recalculate-all-jornada-bonuses";
import { loadUserBracketCache } from "@/lib/scoring/user-bracket-cache";

/** Recalculate all point sources for one user (admin audit repair). */
export async function recalculateUserAllPoints(
  admin: SupabaseClient,
  userId: string
): Promise<void> {
  const { data: userPredMatchIds } = await admin
    .from("predictions")
    .select("match_id")
    .eq("user_id", userId);

  const userMatchIds = new Set((userPredMatchIds ?? []).map((r) => r.match_id));
  if (!userMatchIds.size) {
    await recalculateUserTotalPoints(admin, userId);
    return;
  }

  const { data: finishedMatches } = await admin
    .from("matches")
    .select(
      "id, phase, home_score, away_score, home_team_id, away_team_id, result_advances_team_id"
    )
    .eq("status", "finished")
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .in("id", [...userMatchIds]);

  const bracketCtx = await loadBracketContext(admin);
  const userBracketCache = await loadUserBracketCache(admin, bracketCtx);

  for (const match of finishedMatches ?? []) {
    await processMatchResult(admin, {
      matchId: match.id,
      phase: match.phase as MatchPhase,
      homeScore: match.home_score!,
      awayScore: match.away_score!,
      homeTeamId: match.home_team_id,
      awayTeamId: match.away_team_id,
      resultAdvancesTeamId: match.result_advances_team_id,
    });

    if (
      match.phase !== "group_stage" &&
      match.home_team_id != null &&
      match.away_team_id != null
    ) {
      await processMatchAdvancementBonus(admin, bracketCtx, userBracketCache, {
        matchId: match.id,
        phase: match.phase as MatchPhase,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        homeScore: match.home_score!,
        awayScore: match.away_score!,
        resultAdvancesTeamId: match.result_advances_team_id,
      });
    }
  }

  await recalculateAllJornadaBonuses(admin);
  await processCompletedRoundAdvancementBonuses(admin, bracketCtx);
  await recalculateUserTotalPoints(admin, userId);
}
