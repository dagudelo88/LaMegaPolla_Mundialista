import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchPhase, MatchResult, PredictionInput, ScoringConfig } from "@/lib/scoring/calculate-match-points";
import type { BracketContext } from "@/lib/scoring/bracket-context";
import { computeGatedMatchPoints } from "@/lib/scoring/compute-gated-match-points";

export interface PersistUserMatchPointsInput {
  userId: string;
  matchId: string;
  phase: MatchPhase;
  actual: MatchResult;
  predicted: PredictionInput;
}

export interface PersistUserMatchPointsOptions {
  bracketCtx: BracketContext;
  userResolved: Map<number, { homeTeamId: number | null; awayTeamId: number | null }> | undefined;
  config: ScoringConfig;
}

/** Sole writer to user_match_points — applies REGLAS §7 gate before persist. */
export async function persistUserMatchPoints(
  admin: SupabaseClient,
  input: PersistUserMatchPointsInput,
  options: PersistUserMatchPointsOptions
): Promise<{ points: number }> {
  const { points, rawPoints, gate } = computeGatedMatchPoints(
    options.bracketCtx,
    options.userResolved,
    input.matchId,
    input.phase,
    input.actual,
    input.predicted,
    options.config
  );

  const { error: upsertErr } = await admin.from("user_match_points").upsert(
    {
      user_id: input.userId,
      match_id: input.matchId,
      points,
      breakdown: {
        phase: input.phase,
        actual: input.actual,
        predicted: input.predicted,
        gated: !gate.scorable,
        gateReason: gate.reason,
        blockedTeams: gate.blockedTeams,
        rawPoints,
      },
    },
    { onConflict: "user_id,match_id" }
  );

  if (upsertErr) throw new Error(upsertErr.message);
  return { points };
}

/** Zero-out row for gated users with no scorable prediction breakdown. */
export async function persistGatedZeroMatchPoints(
  admin: SupabaseClient,
  input: {
    userId: string;
    matchId: string;
    phase: MatchPhase;
    gateReason?: string;
    blockedTeams?: number[];
  }
): Promise<void> {
  const { error: upsertErr } = await admin.from("user_match_points").upsert(
    {
      user_id: input.userId,
      match_id: input.matchId,
      points: 0,
      breakdown: {
        phase: input.phase,
        gated: true,
        gateReason: input.gateReason,
        blockedTeams: input.blockedTeams,
      },
    },
    { onConflict: "user_id,match_id" }
  );

  if (upsertErr) throw new Error(upsertErr.message);
}
