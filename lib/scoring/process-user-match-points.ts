import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { processMatchResult } from "@/lib/scoring/process-match-result";

export interface RecalculateUserMatchPointsInput {
  userId: string;
  matchId: string;
  phase: MatchPhase;
  homeScore: number;
  awayScore: number;
}

/** Re-score one user via the shared match engine (REGLAS §7 gate included). */
export async function recalculateUserMatchPoints(
  admin: SupabaseClient,
  input: RecalculateUserMatchPointsInput
): Promise<{ points: number }> {
  const { data: match, error: matchErr } = await admin
    .from("matches")
    .select("home_team_id, away_team_id, result_advances_team_id")
    .eq("id", input.matchId)
    .maybeSingle();

  if (matchErr) throw new Error(matchErr.message);

  await processMatchResult(admin, {
    matchId: input.matchId,
    phase: input.phase,
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    homeTeamId: match?.home_team_id,
    awayTeamId: match?.away_team_id,
    resultAdvancesTeamId: match?.result_advances_team_id,
  });

  const { data: row, error: ptsErr } = await admin
    .from("user_match_points")
    .select("points")
    .eq("user_id", input.userId)
    .eq("match_id", input.matchId)
    .maybeSingle();

  if (ptsErr) throw new Error(ptsErr.message);
  return { points: row?.points ?? 0 };
}
