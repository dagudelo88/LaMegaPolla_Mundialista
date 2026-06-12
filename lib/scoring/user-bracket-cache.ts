import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type BracketContext,
  resolveUserKnockoutTeams,
} from "@/lib/scoring/bracket-context";
import type { DbMatchWithTeams, DbPrediction } from "@/lib/predictions/helpers";
import { loadActiveSubmittedUserIds } from "@/lib/scoring/scoring-eligibility";

export type UserResolvedMap = Map<
  string,
  Map<number, { homeTeamId: number | null; awayTeamId: number | null }>
>;

export async function loadUserBracketCache(
  admin: SupabaseClient,
  ctx: BracketContext
): Promise<UserResolvedMap> {
  const eligibleIds = await loadActiveSubmittedUserIds(admin);
  if (!eligibleIds.size) return new Map();

  const matches = ctx.matches as unknown as DbMatchWithTeams[];
  const { data: predictions } = await admin
    .from("predictions")
    .select("id, match_id, predicted_home, predicted_away, predicted_is_draw, predicted_advances_team_id, locked, user_id")
    .in("user_id", [...eligibleIds]);

  const predsByUser = new Map<string, DbPrediction[]>();
  for (const p of predictions ?? []) {
    const list = predsByUser.get(p.user_id) ?? [];
    list.push(p as DbPrediction);
    predsByUser.set(p.user_id, list);
  }

  const cache: UserResolvedMap = new Map();
  for (const userId of eligibleIds) {
    const userPreds = predsByUser.get(userId) ?? [];
    cache.set(userId, resolveUserKnockoutTeams(ctx, userPreds, matches));
  }

  return cache;
}
