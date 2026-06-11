import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVE_PARTICIPANT_OR_FILTER } from "@/lib/participants/is-active-participant";
import {
  getJornadaKey,
  isJornadaComplete,
  isJornadaEligible,
  resolveJornadaWinners,
} from "@/lib/jornada/helpers";
import { resolveUserPredictedTopScorer } from "@/lib/jornada/resolve-predicted-top-scorer";
import {
  calculateJornadaBonus,
  DEFAULT_JORNADA_BONUS_CONFIG,
  type JornadaBonusConfig,
} from "@/lib/scoring/calculate-jornada-bonus";
import { recalculateUsersTotalPoints } from "@/lib/scoring/recalculate-total-points";

async function loadJornadaBonusConfig(admin: SupabaseClient): Promise<JornadaBonusConfig> {
  const keys = ["scoring.jornada_bonus.match", "scoring.jornada_bonus.exact"] as const;

  const { data, error } = await admin
    .from("app_config")
    .select("key, value")
    .in("key", [...keys]);

  if (error) throw new Error(error.message);

  const byKey = new Map((data ?? []).map((row) => [row.key, row.value]));

  function readNumber(key: string, fallback: number): number {
    const raw = byKey.get(key);
    if (raw == null) return fallback;
    if (typeof raw === "number") return raw;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  return {
    match: readNumber("scoring.jornada_bonus.match", DEFAULT_JORNADA_BONUS_CONFIG.match),
    exact: readNumber("scoring.jornada_bonus.exact", DEFAULT_JORNADA_BONUS_CONFIG.exact),
  };
}

export interface ProcessJornadaBonusResult {
  jornadaKey: string;
  settled: boolean;
  usersScored: number;
  isTie: boolean;
  maxTotalGoals: number;
}

export async function processJornadaBonus(
  admin: SupabaseClient,
  matchId: string
): Promise<ProcessJornadaBonusResult> {
  const { data: triggerMatch, error: matchErr } = await admin
    .from("matches")
    .select("id, kickoff_at, fifa_schedule_date, home_score, away_score, status")
    .eq("id", matchId)
    .single();

  if (matchErr || !triggerMatch) {
    throw new Error(matchErr?.message ?? "Partido no encontrado");
  }

  const jornadaKey = getJornadaKey(triggerMatch);

  const { data: allMatchesRaw, error: jornadaErr } = await admin
    .from("matches")
    .select("id, fifa_match_number, kickoff_at, fifa_schedule_date, status, home_score, away_score");

  if (jornadaErr) throw new Error(jornadaErr.message);

  const allMatches = (allMatchesRaw ?? []).filter(
    (m) => getJornadaKey(m) === jornadaKey
  );

  if (!isJornadaEligible(allMatches)) {
    return { jornadaKey, settled: false, usersScored: 0, isTie: false, maxTotalGoals: 0 };
  }

  if (!isJornadaComplete(allMatches)) {
    return { jornadaKey, settled: false, usersScored: 0, isTie: false, maxTotalGoals: 0 };
  }

  const finishedGoals = allMatches.map((m) => ({
    id: m.id,
    totalGoals: (m.home_score ?? 0) + (m.away_score ?? 0),
  }));

  const { maxTotalGoals, winningMatchIds, isTie } = resolveJornadaWinners(finishedGoals);
  const config = await loadJornadaBonusConfig(admin);
  const jornadaMatchIds = allMatches.map((m) => m.id);

  const { error: resultErr } = await admin.from("jornada_results").upsert(
    {
      jornada_key: jornadaKey,
      max_total_goals: maxTotalGoals,
      winning_match_ids: isTie ? [] : winningMatchIds,
      is_tie: isTie,
      settled_at: new Date().toISOString(),
    },
    { onConflict: "jornada_key" }
  );

  if (resultErr) throw new Error(resultErr.message);

  const { data: predictions, error: predErr } = await admin
    .from("predictions")
    .select("user_id, match_id, predicted_home, predicted_away")
    .in("match_id", jornadaMatchIds)
    .eq("locked", true);

  if (predErr) throw new Error(predErr.message);

  const predsByUser = new Map<
    string,
    { matchId: string; fifaMatchNumber: number; predictedTotalGoals: number }[]
  >();

  for (const pred of predictions ?? []) {
    const match = allMatches.find((m) => m.id === pred.match_id);
    if (!match) continue;
    const list = predsByUser.get(pred.user_id) ?? [];
    list.push({
      matchId: pred.match_id,
      fifaMatchNumber: match.fifa_match_number ?? 0,
      predictedTotalGoals: pred.predicted_home + pred.predicted_away,
    });
    predsByUser.set(pred.user_id, list);
  }

  const candidateUserIds = [...predsByUser.keys()];
  const { data: eligibleProfiles, error: eligibleErr } = await admin
    .from("profiles")
    .select("id")
    .in(
      "id",
      candidateUserIds.length ? candidateUserIds : ["00000000-0000-0000-0000-000000000000"]
    )
    .or(ACTIVE_PARTICIPANT_OR_FILTER)
    .is("withdrawn_at", null);

  if (eligibleErr) throw new Error(eligibleErr.message);

  const eligibleIds = new Set((eligibleProfiles ?? []).map((p) => p.id));
  const scoredUserIds: string[] = [];

  for (const userId of candidateUserIds) {
    if (!eligibleIds.has(userId)) continue;

    const userPreds = predsByUser.get(userId) ?? [];
    const topScorer = resolveUserPredictedTopScorer(userPreds);
    if (!topScorer) continue;

    const pickedMatch = allMatches.find((m) => m.id === topScorer.matchId);
    const actualTotalGoals = pickedMatch
      ? (pickedMatch.home_score ?? 0) + (pickedMatch.away_score ?? 0)
      : 0;

    const points = calculateJornadaBonus({
      pickedMatchId: topScorer.matchId,
      winningMatchIds,
      isTie,
      predictedTotalGoals: topScorer.predictedTotalGoals,
      actualTotalGoals,
      config,
    });

    const { error: upsertErr } = await admin.from("user_jornada_bonus_points").upsert(
      {
        user_id: userId,
        jornada_key: jornadaKey,
        points,
        breakdown: {
          pickedMatchId: topScorer.matchId,
          derivedFromPredictions: true,
          winningMatchIds: isTie ? [] : winningMatchIds,
          isTie,
          maxTotalGoals,
          predictedTotalGoals: topScorer.predictedTotalGoals,
          actualTotalGoals,
        },
      },
      { onConflict: "user_id,jornada_key" }
    );

    if (upsertErr) throw new Error(upsertErr.message);
    scoredUserIds.push(userId);
  }

  if (scoredUserIds.length) {
    await recalculateUsersTotalPoints(admin, scoredUserIds);
  }

  return {
    jornadaKey,
    settled: true,
    usersScored: scoredUserIds.length,
    isTie,
    maxTotalGoals,
  };
}
