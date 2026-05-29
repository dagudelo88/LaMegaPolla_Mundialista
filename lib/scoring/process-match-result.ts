import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateMatchPoints,
  type MatchPhase,
} from "@/lib/scoring/calculate-match-points";
import { loadScoringConfig } from "@/lib/scoring/load-scoring-config";
import { recalculateUsersTotalPoints } from "@/lib/scoring/recalculate-total-points";

export interface ProcessMatchResultInput {
  matchId: string;
  phase: MatchPhase;
  homeScore: number;
  awayScore: number;
}

export async function processMatchResult(
  admin: SupabaseClient,
  input: ProcessMatchResultInput
): Promise<{ usersScored: number }> {
  const config = await loadScoringConfig(admin);

  const { data: predictions, error: predErr } = await admin
    .from("predictions")
    .select("user_id, predicted_home, predicted_away")
    .eq("match_id", input.matchId)
    .eq("locked", true);

  if (predErr) throw new Error(predErr.message);

  const actual = { home: input.homeScore, away: input.awayScore };
  const userIds: string[] = [];

  for (const pred of predictions ?? []) {
    const points = calculateMatchPoints(
      input.phase,
      actual,
      { home: pred.predicted_home, away: pred.predicted_away },
      config
    );

    const { error: upsertErr } = await admin.from("user_match_points").upsert(
      {
        user_id: pred.user_id,
        match_id: input.matchId,
        points,
        breakdown: {
          phase: input.phase,
          actual,
          predicted: { home: pred.predicted_home, away: pred.predicted_away },
        },
      },
      { onConflict: "user_id,match_id" }
    );

    if (upsertErr) throw new Error(upsertErr.message);
    userIds.push(pred.user_id);
  }

  await recalculateUsersTotalPoints(admin, userIds);
  return { usersScored: userIds.length };
}
