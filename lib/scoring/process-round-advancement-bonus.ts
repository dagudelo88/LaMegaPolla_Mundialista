import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { roundAdvancementBonusKey } from "@/lib/scoring/advancement-bonus-keys";
import {
  teamsForRoundComparison,
  calculateRoundAdvancementBonus,
} from "@/lib/scoring/calculate-round-advancement-bonus";
import {
  type BracketContext,
  isRoundComplete,
  resolveUserKnockoutTeams,
  teamsInPhase,
} from "@/lib/scoring/bracket-context";
import { loadAdvancementBonusPerTeam } from "@/lib/scoring/load-advancement-bonus-config";
import {
  KNOCKOUT_PHASES,
  nextKnockoutPhaseAfterRound,
} from "@/lib/scoring/knockout-phase-order";
import { loadActiveSubmittedUserIds } from "@/lib/scoring/scoring-eligibility";
import { recalculateUsersTotalPoints } from "@/lib/scoring/recalculate-total-points";
import type { DbMatchWithTeams, DbPrediction } from "@/lib/predictions/helpers";

function buildUserTeamsByPhase(
  ctx: BracketContext,
  userResolved: Map<number, { homeTeamId: number | null; awayTeamId: number | null }>
): Map<MatchPhase, Set<number>> {
  const map = new Map<MatchPhase, Set<number>>();
  for (const phase of KNOCKOUT_PHASES) {
    map.set(phase, teamsInPhase(userResolved, ctx.knockoutDefs, phase));
  }
  return map;
}

export async function processRoundAdvancementBonus(
  admin: SupabaseClient,
  ctx: BracketContext,
  roundKey: string,
  options?: { skipTotalRecalc?: boolean }
): Promise<{ usersScored: number }> {
  if (!isRoundComplete(ctx, roundKey)) {
    return { usersScored: 0 };
  }

  const nextPhase = nextKnockoutPhaseAfterRound(roundKey);
  const bonusPerTeam = await loadAdvancementBonusPerTeam(admin);
  const eligibleIds = await loadActiveSubmittedUserIds(admin);
  if (!eligibleIds.size) return { usersScored: 0 };

  const matches = ctx.matches as unknown as DbMatchWithTeams[];
  const { data: allPredictions } = await admin
    .from("predictions")
    .select(
      "id, match_id, predicted_home, predicted_away, predicted_is_draw, predicted_advances_team_id, locked, user_id"
    )
    .in("user_id", [...eligibleIds]);

  const predsByUser = new Map<string, DbPrediction[]>();
  for (const p of allPredictions ?? []) {
    const list = predsByUser.get(p.user_id) ?? [];
    list.push(p as DbPrediction);
    predsByUser.set(p.user_id, list);
  }

  const officialTeamsByPhase = ctx.officialTeamsByPhase;
  const scoredUserIds: string[] = [];

  for (const userId of eligibleIds) {
    const predictions = predsByUser.get(userId) ?? [];
    const userResolved = resolveUserKnockoutTeams(ctx, predictions, matches);
    const userTeamsByPhase = buildUserTeamsByPhase(ctx, userResolved);

    const { userTeamIds, officialTeamIds } = teamsForRoundComparison(
      roundKey,
      nextPhase,
      userTeamsByPhase,
      officialTeamsByPhase
    );

    const result = calculateRoundAdvancementBonus(userTeamIds, officialTeamIds, bonusPerTeam);

    const { error } = await admin.from("user_advancement_bonus_points").upsert(
      {
        user_id: userId,
        bonus_key: roundAdvancementBonusKey(roundKey),
        points: result.points,
        breakdown: {
          type: "round",
          roundKey,
          nextPhase,
          correctTeamIds: result.correctTeamIds,
          incorrectTeamIds: result.incorrectTeamIds,
          userTeamIds: result.userTeamIds,
          officialTeamIds: result.officialTeamIds,
        },
      },
      { onConflict: "user_id,bonus_key" }
    );

    if (error) throw new Error(error.message);
    scoredUserIds.push(userId);
  }

  if (!options?.skipTotalRecalc) {
    await recalculateUsersTotalPoints(admin, scoredUserIds);
  }

  return { usersScored: scoredUserIds.length };
}

export async function processAllCompletedRoundAdvancementBonuses(
  admin: SupabaseClient,
  ctx?: BracketContext
): Promise<{ roundsProcessed: number; usersScored: number }> {
  const { loadBracketContext } = await import("@/lib/scoring/bracket-context");
  const bracketCtx = ctx ?? await loadBracketContext(admin);

  const roundKeys = [
    "group_stage",
    "round_of_32",
    "round_of_16",
    "quarter_final",
    "semi_final",
    "third_place",
    "final",
  ];

  let roundsProcessed = 0;
  const allUserIds = new Set<string>();

  for (const roundKey of roundKeys) {
    if (!isRoundComplete(bracketCtx, roundKey)) continue;
    const result = await processRoundAdvancementBonus(admin, bracketCtx, roundKey, {
      skipTotalRecalc: true,
    });
    roundsProcessed += 1;
    if (result.usersScored > 0) {
      const eligibleIds = await loadActiveSubmittedUserIds(admin);
      for (const id of eligibleIds) allUserIds.add(id);
    }
  }

  if (allUserIds.size > 0) {
    await recalculateUsersTotalPoints(admin, [...allUserIds]);
  }

  return { roundsProcessed, usersScored: allUserIds.size };
}
