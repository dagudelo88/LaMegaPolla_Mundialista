import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateMatchPoints,
  type MatchPhase,
} from "@/lib/scoring/calculate-match-points";
import { loadScoringConfig } from "@/lib/scoring/load-scoring-config";
import { recalculateUsersTotalPoints } from "@/lib/scoring/recalculate-total-points";
import {
  countScorableMatchPredictions,
  loadScorableMatchPredictions,
} from "@/lib/scoring/scoring-eligibility";

export interface ProcessMatchResultInput {
  matchId: string;
  phase: MatchPhase;
  homeScore: number;
  awayScore: number;
}

export interface ProcessMatchResultOutput {
  usersScored: number;
  eligibleCount: number;
}

export async function processMatchResult(
  admin: SupabaseClient,
  input: ProcessMatchResultInput
): Promise<ProcessMatchResultOutput> {
  const config = await loadScoringConfig(admin);
  const predictions = await loadScorableMatchPredictions(admin, input.matchId);
  const scoredUserIds: string[] = [];

  for (const pred of predictions) {
    const actual = { home: input.homeScore, away: input.awayScore };
    const points = calculateMatchPoints(
      input.phase,
      actual,
      { home: pred.predictedHome, away: pred.predictedAway },
      config
    );

    const { error: upsertErr } = await admin.from("user_match_points").upsert(
      {
        user_id: pred.userId,
        match_id: input.matchId,
        points,
        breakdown: {
          phase: input.phase,
          actual,
          predicted: { home: pred.predictedHome, away: pred.predictedAway },
        },
      },
      { onConflict: "user_id,match_id" }
    );

    if (upsertErr) throw new Error(upsertErr.message);
    scoredUserIds.push(pred.userId);
  }

  await recalculateUsersTotalPoints(admin, scoredUserIds);
  return { usersScored: scoredUserIds.length, eligibleCount: predictions.length };
}

export { countScorableMatchPredictions };
