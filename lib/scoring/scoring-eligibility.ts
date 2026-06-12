import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVE_PARTICIPANT_OR_FILTER } from "@/lib/participants/is-active-participant";

export interface ScorablePrediction {
  userId: string;
  matchId: string;
  predictedHome: number;
  predictedAway: number;
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

/** Scorable predictions for one match — never filters by predictions.locked. */
export async function loadScorableMatchPredictions(
  admin: SupabaseClient,
  matchId: string
): Promise<ScorablePrediction[]> {
  const eligibleIds = await loadActiveSubmittedUserIds(admin);
  if (!eligibleIds.size) return [];

  const { data: predictions, error: predErr } = await admin
    .from("predictions")
    .select("user_id, match_id, predicted_home, predicted_away")
    .eq("match_id", matchId)
    .in("user_id", [...eligibleIds]);

  if (predErr) throw new Error(predErr.message);

  return (predictions ?? [])
    .filter((p) => eligibleIds.has(p.user_id))
    .map((p) => ({
      userId: p.user_id,
      matchId: p.match_id,
      predictedHome: p.predicted_home,
      predictedAway: p.predicted_away,
    }));
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
    .select("user_id, match_id, predicted_home, predicted_away")
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
    }));
}

export async function countScorableMatchPredictions(
  admin: SupabaseClient,
  matchId: string
): Promise<number> {
  const predictions = await loadScorableMatchPredictions(admin, matchId);
  return predictions.length;
}
