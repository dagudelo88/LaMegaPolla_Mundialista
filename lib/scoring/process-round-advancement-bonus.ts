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
  teamsInPhase,
} from "@/lib/scoring/bracket-context";
import { loadAdvancementBonusPerTeam } from "@/lib/scoring/load-advancement-bonus-config";
import {
  KNOCKOUT_PHASES,
  nextKnockoutPhaseAfterRound,
} from "@/lib/scoring/knockout-phase-order";
import { loadActiveSubmittedUserIds } from "@/lib/scoring/scoring-eligibility";
import { recalculateUsersTotalPoints } from "@/lib/scoring/recalculate-total-points";
import {
  loadUserBracketCache,
  type UserResolvedMap,
} from "@/lib/scoring/user-bracket-cache";

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

/** True when official next-round teams exist but the user bracket resolved none (likely incomplete preds). */
export function shouldSkipEmptyUserRoundBonus(
  userTeamIds: number[],
  officialTeamIds: number[]
): boolean {
  return officialTeamIds.length > 0 && userTeamIds.length === 0;
}

export async function processRoundAdvancementBonus(
  admin: SupabaseClient,
  ctx: BracketContext,
  roundKey: string,
  options?: {
    skipTotalRecalc?: boolean;
    userBracketCache?: UserResolvedMap;
    throwOnEmptyUserTeams?: boolean;
  }
): Promise<{ usersScored: number; skippedEmptyBrackets: number }> {
  if (!isRoundComplete(ctx, roundKey)) {
    return { usersScored: 0, skippedEmptyBrackets: 0 };
  }

  const nextPhase = nextKnockoutPhaseAfterRound(roundKey);
  const bonusPerTeam = await loadAdvancementBonusPerTeam(admin);
  const eligibleIds = await loadActiveSubmittedUserIds(admin);
  if (!eligibleIds.size) return { usersScored: 0, skippedEmptyBrackets: 0 };

  const userBracketCache =
    options?.userBracketCache ?? (await loadUserBracketCache(admin, ctx));
  const officialTeamsByPhase = ctx.officialTeamsByPhase;
  const scoredUserIds: string[] = [];
  const skippedUserIds: string[] = [];

  for (const userId of eligibleIds) {
    const userResolved = userBracketCache.get(userId);
    if (!userResolved) continue;
    const userTeamsByPhase = buildUserTeamsByPhase(ctx, userResolved);

    const { userTeamIds, officialTeamIds } = teamsForRoundComparison(
      roundKey,
      nextPhase,
      userTeamsByPhase,
      officialTeamsByPhase
    );

    if (shouldSkipEmptyUserRoundBonus(userTeamIds, officialTeamIds)) {
      console.warn(
        `[round-advancement] Skipping upsert for user ${userId} on ${roundKey}: empty userTeamIds with ${officialTeamIds.length} official team(s)`
      );
      skippedUserIds.push(userId);
      continue;
    }

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

  if (options?.throwOnEmptyUserTeams && skippedUserIds.length > 0) {
    throw new Error(
      `Error de bono de avance (${roundKey}): ${skippedUserIds.length} participante(s) con llave vacía pese a equipos oficiales. No se escribió 0 falso.`
    );
  }

  if (!options?.skipTotalRecalc) {
    await recalculateUsersTotalPoints(admin, scoredUserIds);
  }

  return {
    usersScored: scoredUserIds.length,
    skippedEmptyBrackets: skippedUserIds.length,
  };
}

export async function processAllCompletedRoundAdvancementBonuses(
  admin: SupabaseClient,
  ctx?: BracketContext
): Promise<{ roundsProcessed: number; usersScored: number }> {
  const { loadBracketContext } = await import("@/lib/scoring/bracket-context");
  const bracketCtx = ctx ?? (await loadBracketContext(admin));
  const userBracketCache = await loadUserBracketCache(admin, bracketCtx);

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
      userBracketCache,
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
