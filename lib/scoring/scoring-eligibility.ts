import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVE_PARTICIPANT_OR_FILTER } from "@/lib/participants/is-active-participant";
import type { BracketContext } from "@/lib/scoring/bracket-context";
import { isKnockoutMatchScorableForUserByMatchNumber } from "@/lib/scoring/bracket-gate";
import type { UserResolvedMap } from "@/lib/scoring/user-bracket-cache";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";

export interface ScorablePrediction {
  userId: string;
  matchId: string;
  predictedHome: number;
  predictedAway: number;
  predictedAdvancesTeamId: number | null;
}

/** Active pool participants with a complete tournament submission (REGLAS §2–§3). */
export async function loadActiveSubmittedUserIds(
  admin: SupabaseClient
): Promise<Set<string>> {
  const { data: submissions, error: subErr } = await admin
    .from("user_tournament_submissions")
    .select("user_id")
    .eq("is_complete", true);

  if (subErr) throw new Error(subErr.message);

  const userIds = [...new Set((submissions ?? []).map((s) => s.user_id))];
  if (!userIds.length) return new Set();

  const { data: profiles, error: profileErr } = await admin
    .from("profiles")
    .select("id")
    .in("id", userIds)
    .or(ACTIVE_PARTICIPANT_OR_FILTER)
    .is("withdrawn_at", null);

  if (profileErr) throw new Error(profileErr.message);

  return new Set((profiles ?? []).map((p) => p.id));
}

/** Scorable predictions for one match — applies §7 bracket gate for knockouts. */
export async function loadScorableMatchPredictions(
  admin: SupabaseClient,
  matchId: string,
  options?: {
    bracketCtx?: BracketContext;
    userBracketCache?: UserResolvedMap;
    phase?: MatchPhase;
  }
): Promise<ScorablePrediction[]> {
  const eligibleIds = await loadActiveSubmittedUserIds(admin);
  if (!eligibleIds.size) return [];

  const { data: predictions, error: predErr } = await admin
    .from("predictions")
    .select("user_id, match_id, predicted_home, predicted_away, predicted_advances_team_id")
    .eq("match_id", matchId)
    .in("user_id", [...eligibleIds]);

  if (predErr) throw new Error(predErr.message);

  const phase = options?.phase;
  const isKnockout = phase != null && phase !== "group_stage";

  return (predictions ?? [])
    .filter((p) => eligibleIds.has(p.user_id))
    .filter((p) => {
      if (!isKnockout || !options?.bracketCtx || !options?.userBracketCache) return true;
      const userResolved = options.userBracketCache.get(p.user_id);
      if (!userResolved) return true;
      const gate = isKnockoutMatchScorableForUserByMatchNumber(
        options.bracketCtx,
        userResolved,
        matchId
      );
      return gate.scorable;
    })
    .map((p) => ({
      userId: p.user_id,
      matchId: p.match_id,
      predictedHome: p.predicted_home,
      predictedAway: p.predicted_away,
      predictedAdvancesTeamId: p.predicted_advances_team_id,
    }));
}

/** Predictions blocked by §7 bracket gate (for audit UI). */
export async function loadGatedMatchPredictions(
  admin: SupabaseClient,
  matchId: string,
  bracketCtx: BracketContext,
  userBracketCache: UserResolvedMap,
  phase: MatchPhase
): Promise<
  Array<{
    userId: string;
    predictedHome: number;
    predictedAway: number;
    blockedTeams: number[];
  }>
> {
  if (phase === "group_stage") return [];

  const eligibleIds = await loadActiveSubmittedUserIds(admin);
  const { data: predictions } = await admin
    .from("predictions")
    .select("user_id, predicted_home, predicted_away")
    .eq("match_id", matchId)
    .in("user_id", [...eligibleIds]);

  const gated: Array<{
    userId: string;
    predictedHome: number;
    predictedAway: number;
    blockedTeams: number[];
  }> = [];

  for (const p of predictions ?? []) {
    const userResolved = userBracketCache.get(p.user_id);
    if (!userResolved) continue;
    const gate = isKnockoutMatchScorableForUserByMatchNumber(
      bracketCtx,
      userResolved,
      matchId
    );
    if (!gate.scorable && gate.blockedTeams?.length) {
      gated.push({
        userId: p.user_id,
        predictedHome: p.predicted_home,
        predictedAway: p.predicted_away,
        blockedTeams: gate.blockedTeams,
      });
    }
  }

  return gated;
}

/** Scorable predictions across multiple matches (jornada bonus). */
export async function loadScorablePredictionsForMatchIds(
  admin: SupabaseClient,
  matchIds: string[]
): Promise<ScorablePrediction[]> {
  if (!matchIds.length) return [];

  const eligibleIds = await loadActiveSubmittedUserIds(admin);
  if (!eligibleIds.size) return [];

  const { data: predictions, error: predErr } = await admin
    .from("predictions")
    .select("user_id, match_id, predicted_home, predicted_away, predicted_advances_team_id")
    .in("match_id", matchIds)
    .in("user_id", [...eligibleIds]);

  if (predErr) throw new Error(predErr.message);

  return (predictions ?? [])
    .filter((p) => eligibleIds.has(p.user_id))
    .map((p) => ({
      userId: p.user_id,
      matchId: p.match_id,
      predictedHome: p.predicted_home,
      predictedAway: p.predicted_away,
      predictedAdvancesTeamId: p.predicted_advances_team_id,
    }));
}

export async function countScorableMatchPredictions(
  admin: SupabaseClient,
  matchId: string,
  options?: {
    bracketCtx?: BracketContext;
    userBracketCache?: UserResolvedMap;
    phase?: MatchPhase;
  }
): Promise<number> {
  const predictions = await loadScorableMatchPredictions(admin, matchId, options);
  return predictions.length;
}
