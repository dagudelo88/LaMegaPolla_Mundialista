import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateMatchPoints,
  type MatchPhase,
} from "@/lib/scoring/calculate-match-points";
import { loadScoringConfig } from "@/lib/scoring/load-scoring-config";
import { recalculateUsersTotalPoints } from "@/lib/scoring/recalculate-total-points";

export interface RecalculateUserMatchPointsInput {
  userId: string;
  matchId: string;
  phase: MatchPhase;
  homeScore: number;
  awayScore: number;
}

export async function recalculateUserMatchPoints(
  admin: SupabaseClient,
  input: RecalculateUserMatchPointsInput
): Promise<{ points: number }> {
  const config = await loadScoringConfig(admin);

  const { data: prediction, error: predErr } = await admin
    .from("predictions")
    .select("predicted_home, predicted_away")
    .eq("user_id", input.userId)
    .eq("match_id", input.matchId)
    .maybeSingle();

  if (predErr) throw new Error(predErr.message);
  if (!prediction) return { points: 0 };

  const actual = { home: input.homeScore, away: input.awayScore };
  const points = calculateMatchPoints(
    input.phase,
    actual,
    { home: prediction.predicted_home, away: prediction.predicted_away },
    config
  );

  const { error: upsertErr } = await admin.from("user_match_points").upsert(
    {
      user_id: input.userId,
      match_id: input.matchId,
      points,
      breakdown: {
        phase: input.phase,
        actual,
        predicted: {
          home: prediction.predicted_home,
          away: prediction.predicted_away,
        },
      },
    },
    { onConflict: "user_id,match_id" }
  );

  if (upsertErr) throw new Error(upsertErr.message);

  await recalculateUsersTotalPoints(admin, [input.userId]);
  return { points };
}
