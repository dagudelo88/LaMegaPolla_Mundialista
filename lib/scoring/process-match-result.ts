import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type MatchPhase,
  type ScoringConfig,
} from "@/lib/scoring/calculate-match-points";
import { loadBracketContext, type BracketContext } from "@/lib/scoring/bracket-context";
import { loadScoringConfig } from "@/lib/scoring/load-scoring-config";
import { processMatchAdvancementBonus } from "@/lib/scoring/process-match-advancement-bonus";
import {
  persistGatedZeroMatchPoints,
  persistUserMatchPoints,
} from "@/lib/scoring/persist-user-match-points";
import { resolveOfficialMatchTeamIds } from "@/lib/scoring/resolve-match-team-ids";
import { recalculateUsersTotalPoints } from "@/lib/scoring/recalculate-total-points";
import {
  countScorableMatchPredictions,
  loadScorableMatchPredictions,
} from "@/lib/scoring/scoring-eligibility";
import { loadUserBracketCache, type UserResolvedMap } from "@/lib/scoring/user-bracket-cache";
import { isKnockoutMatchScorableForUserByMatchNumber } from "@/lib/scoring/bracket-gate";

export interface ProcessMatchResultOptions {
  bracketCtx?: BracketContext;
  userBracketCache?: UserResolvedMap;
  config?: ScoringConfig;
  /** Batch backfill: skip per-match profile total updates. */
  deferTotalRecalc?: boolean;
}

export interface ProcessMatchResultInput {
  matchId: string;
  phase: MatchPhase;
  homeScore: number;
  awayScore: number;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  resultAdvancesTeamId?: number | null;
}

export interface ProcessMatchResultOutput {
  usersScored: number;
  eligibleCount: number;
}

export async function processMatchResult(
  admin: SupabaseClient,
  input: ProcessMatchResultInput,
  options?: ProcessMatchResultOptions
): Promise<ProcessMatchResultOutput> {
  const config = options?.config ?? (await loadScoringConfig(admin));
  const bracketCtx = options?.bracketCtx ?? (await loadBracketContext(admin));
  const userBracketCache =
    options?.userBracketCache ?? (await loadUserBracketCache(admin, bracketCtx));

  const eligibilityOpts = {
    bracketCtx,
    userBracketCache,
    phase: input.phase,
  };

  const predictions = await loadScorableMatchPredictions(
    admin,
    input.matchId,
    eligibilityOpts
  );
  const scoredUserIds: string[] = [];
  const usersToRecalculate = new Set<string>();

  const matchRow = bracketCtx.matchById.get(input.matchId);
  const { homeTeamId, awayTeamId } = resolveOfficialMatchTeamIds(bracketCtx, input.matchId, {
    homeTeamId: input.homeTeamId ?? matchRow?.home_team_id,
    awayTeamId: input.awayTeamId ?? matchRow?.away_team_id,
  });
  const resultAdvancesTeamId =
    input.resultAdvancesTeamId ?? matchRow?.result_advances_team_id ?? null;

  const actual = { home: input.homeScore, away: input.awayScore };
  const persistOpts = { bracketCtx, config };

  for (const pred of predictions) {
    const userResolved = userBracketCache.get(pred.userId);
    await persistUserMatchPoints(
      admin,
      {
        userId: pred.userId,
        matchId: input.matchId,
        phase: input.phase,
        actual,
        predicted: { home: pred.predictedHome, away: pred.predictedAway },
      },
      { ...persistOpts, userResolved }
    );

    scoredUserIds.push(pred.userId);
    usersToRecalculate.add(pred.userId);
  }

  const eligibleIds = new Set(predictions.map((p) => p.userId));
  const { data: allPreds } = await admin
    .from("predictions")
    .select("user_id")
    .eq("match_id", input.matchId);

  for (const row of allPreds ?? []) {
    if (eligibleIds.has(row.user_id)) continue;
    const userResolved = userBracketCache.get(row.user_id);
    if (!userResolved) continue;
    const gate = isKnockoutMatchScorableForUserByMatchNumber(
      bracketCtx,
      userResolved,
      input.matchId
    );
    if (!gate.scorable) {
      await persistGatedZeroMatchPoints(admin, {
        userId: row.user_id,
        matchId: input.matchId,
        phase: input.phase,
        gateReason: gate.reason,
        blockedTeams: gate.blockedTeams,
      });
      usersToRecalculate.add(row.user_id);
    }
  }

  if (
    input.phase !== "group_stage" &&
    homeTeamId != null &&
    awayTeamId != null
  ) {
    const { userIds: advancementUserIds } = await processMatchAdvancementBonus(
      admin,
      bracketCtx,
      userBracketCache,
      {
        matchId: input.matchId,
        phase: input.phase,
        homeTeamId,
        awayTeamId,
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        resultAdvancesTeamId,
      }
    );
    for (const id of advancementUserIds) usersToRecalculate.add(id);
  }

  if (!options?.deferTotalRecalc) {
    await recalculateUsersTotalPoints(admin, [...usersToRecalculate]);
  }
  const eligibleCount = await countScorableMatchPredictions(
    admin,
    input.matchId,
    eligibilityOpts
  );

  return { usersScored: scoredUserIds.length, eligibleCount };
}

export { countScorableMatchPredictions };
