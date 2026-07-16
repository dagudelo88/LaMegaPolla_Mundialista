import type { SupabaseClient } from "@supabase/supabase-js";
import { type BracketContext, isRoundComplete } from "@/lib/scoring/bracket-context";
import { processRoundAdvancementBonus } from "@/lib/scoring/process-round-advancement-bonus";
import { loadUserBracketCache } from "@/lib/scoring/user-bracket-cache";
import { recalculateUsersTotalPoints } from "@/lib/scoring/recalculate-total-points";

const ROUND_KEYS = [
  "group_stage",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
] as const;

export async function processCompletedRoundAdvancementBonuses(
  admin: SupabaseClient,
  ctx: BracketContext
): Promise<{ roundsProcessed: number; usersScored: number }> {
  const userBracketCache = await loadUserBracketCache(admin, ctx);
  let roundsProcessed = 0;
  let usersScored = 0;
  const allUserIds = new Set<string>();

  for (const roundKey of ROUND_KEYS) {
    if (!isRoundComplete(ctx, roundKey)) continue;
    const result = await processRoundAdvancementBonus(admin, ctx, roundKey, {
      skipTotalRecalc: true,
      userBracketCache,
    });
    roundsProcessed += 1;
    usersScored += result.usersScored;
    if (result.usersScored > 0) {
      for (const [userId] of userBracketCache) allUserIds.add(userId);
    }
  }

  if (allUserIds.size > 0) {
    await recalculateUsersTotalPoints(admin, [...allUserIds]);
  }

  return { roundsProcessed, usersScored };
}
