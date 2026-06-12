import type { SupabaseClient } from "@supabase/supabase-js";
import { type BracketContext, isRoundComplete } from "@/lib/scoring/bracket-context";
import { processRoundAdvancementBonus } from "@/lib/scoring/process-round-advancement-bonus";

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
  let roundsProcessed = 0;
  let usersScored = 0;

  for (const roundKey of ROUND_KEYS) {
    if (!isRoundComplete(ctx, roundKey)) continue;
    const result = await processRoundAdvancementBonus(admin, ctx, roundKey);
    roundsProcessed += 1;
    usersScored += result.usersScored;
  }

  return { roundsProcessed, usersScored };
}
