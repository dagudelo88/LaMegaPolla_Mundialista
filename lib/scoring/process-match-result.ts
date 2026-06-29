import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateMatchPoints,
  type MatchPhase,
} from "@/lib/scoring/calculate-match-points";
import { loadBracketContext } from "@/lib/scoring/bracket-context";
import { loadScoringConfig } from "@/lib/scoring/load-scoring-config";
import { processMatchAdvancementBonus } from "@/lib/scoring/process-match-advancement-bonus";
import { resolveOfficialMatchTeamIds } from "@/lib/scoring/resolve-match-team-ids";
import { recalculateUsersTotalPoints } from "@/lib/scoring/recalculate-total-points";
import {
  countScorableMatchPredictions,
  loadScorableMatchPredictions,
} from "@/lib/scoring/scoring-eligibility";
import { loadUserBracketCache } from "@/lib/scoring/user-bracket-cache";
import { isKnockoutMatchScorableForUserByMatchNumber } from "@/lib/scoring/bracket-gate";

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
  input: ProcessMatchResultInput
): Promise<ProcessMatchResultOutput> {
  const config = await loadScoringConfig(admin);
  const bracketCtx = await loadBracketContext(admin);
  const userBracketCache = await loadUserBracketCache(admin, bracketCtx);

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

  for (const pred of predictions) {
    const actual = { home: input.homeScore, away: input.awayScore };
    const points = calculateMatchPoints(
      input.phase,
      actual,
      { home: pred.predictedHome, away: pred.predictedAway },
      config
    );

    const userResolved = userBracketCache.get(pred.userId);
    const gate = userResolved
      ? isKnockoutMatchScorableForUserByMatchNumber(
          bracketCtx,
          userResolved,
          input.matchId
        )
      : { scorable: true };

    const { error: upsertErr } = await admin.from("user_match_points").upsert(
      {
        user_id: pred.userId,
        match_id: input.matchId,
        points: gate.scorable ? points : 0,
        breakdown: {
          phase: input.phase,
          actual,
          predicted: { home: pred.predictedHome, away: pred.predictedAway },
          gated: !gate.scorable,
          gateReason: gate.reason,
          blockedTeams: gate.blockedTeams,
          rawPoints: points,
        },
      },
      { onConflict: "user_id,match_id" }
    );

    if (upsertErr) throw new Error(upsertErr.message);
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
      await admin.from("user_match_points").upsert(
        {
          user_id: row.user_id,
          match_id: input.matchId,
          points: 0,
          breakdown: {
            phase: input.phase,
            gated: true,
            gateReason: gate.reason,
            blockedTeams: gate.blockedTeams,
          },
        },
        { onConflict: "user_id,match_id" }
      );
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

  await recalculateUsersTotalPoints(admin, [...usersToRecalculate]);
  const eligibleCount = await countScorableMatchPredictions(
    admin,
    input.matchId,
    eligibilityOpts
  );

  return { usersScored: scoredUserIds.length, eligibleCount };
}

export { countScorableMatchPredictions };
