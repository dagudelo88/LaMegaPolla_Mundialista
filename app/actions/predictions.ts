"use server";

import { requireUser } from "@/lib/auth/require-admin";
import { getPaidChangeCost } from "@/lib/changes/paid-change-cost";
import { countPaidChangesToday } from "@/lib/changes/count-paid-changes-today";
import { getTournamentTodayKey } from "@/lib/changes/tournament-today";
import { getConfig, getConfigNumber } from "@/lib/config/get-config";
import { DEFAULT_GLOBAL_DEADLINE } from "@/lib/config/tournament-deadline";
import {
  getGlobalDeadlineIso,
  isGlobalDeadlinePassed,
  isLateSubmissionWindowOpen,
  isPredictionEditingClosed,
} from "@/lib/predictions/global-deadline";
import { getUserLateSubmissionUntil } from "@/lib/predictions/late-submission-access";
import { syncUserPredictionLockState } from "@/lib/predictions/sync-submission-lock-state";
import { buildGroupResultsFromPredictions, resolveAdvancingThirdGroups } from "@/lib/predictions/helpers";
import { fetchPronosticosPayload } from "@/lib/predictions/fetch-pronosticos-payload";
import { canPaidChangeMatch } from "@/lib/predictions/paid-change-eligibility";
import { loadQualifierAdjustmentWindowState, isQualifierAdjustmentMatch } from "@/lib/predictions/qualifier-adjustment-window";
import { validateFullSubmission } from "@/lib/predictions/submission-validator";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { recalculateUserMatchPoints } from "@/lib/scoring/process-user-match-points";
import { recalculateUserTotalPoints } from "@/lib/scoring/recalculate-total-points";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";

function clampScore(n: number): number {
  if (!Number.isInteger(n) || n < 0 || n > 20) {
    throw new Error("invalid_score");
  }
  return n;
}

async function getSubmissionState(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_tournament_submissions")
    .select("is_complete")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.is_complete ?? false;
}

async function getUserLateSubmissionUntilForUser(userId: string): Promise<string | null> {
  return getUserLateSubmissionUntil(userId);
}

/** Auto-save draft prediction (REGLAS §3, before final submit) */
export async function savePredictionDraft(
  matchId: string,
  newHome: number,
  newAway: number,
  opts?: {
    predictedIsDraw?: boolean;
    predictedAdvancesTeamId?: number | null;
  }
) {
  const user = await requireUser();
  const supabase = await createClient();

  const globalDeadline = await getGlobalDeadlineIso();
  const lateSubmissionUntil = await getUserLateSubmissionUntilForUser(user.id);
  if (isPredictionEditingClosed(globalDeadline, lateSubmissionUntil)) {
    throw new Error("deadline_passed");
  }

  await syncUserPredictionLockState(user.id);

  const home = clampScore(newHome);
  const away = clampScore(newAway);

  const { data: match } = await supabase
    .from("matches")
    .select("id, phase, prediction_deadline, status")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) throw new Error("match_not_found");

  // Per-match lock (status / kickoff deadline) applies only to paid changes after the global deadline (REGLAS §5).
  // During the initial poll window, players may edit any fixture freely until 10 Jun 23:59 Colombia.

  const isKnockout = match.phase !== "group_stage";
  const isDraw = home === away;
  let advancesId = opts?.predictedAdvancesTeamId ?? null;

  if (isKnockout && isDraw && advancesId == null) {
    throw new Error("advance_team_required");
  }
  if (!isDraw) {
    advancesId = null;
  }

  const { error } = await supabase.from("predictions").upsert(
    {
      user_id: user.id,
      match_id: matchId,
      predicted_home: home,
      predicted_away: away,
      predicted_is_draw: isKnockout && isDraw,
      predicted_advances_team_id: advancesId,
      locked: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,match_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/pronosticos");
}

/** Final tournament submission — locks all predictions (REGLAS §3) */
export async function submitFullTournament() {
  const user = await requireUser();
  const supabase = await createClient();

  const submitted = await getSubmissionState(user.id);
  if (submitted) throw new Error("already_submitted");

  const globalDeadline = (await getConfig<string>("tournament.global_deadline")) ?? DEFAULT_GLOBAL_DEADLINE;
  const lateSubmissionUntil = await getUserLateSubmissionUntilForUser(user.id);

  const { data: matches } = await supabase
    .from("matches")
    .select("id, fifa_match_number, phase, home_team_id, away_team_id")
    .order("fifa_match_number");

  const { data: predictions } = await supabase
    .from("predictions")
    .select("id, match_id, predicted_home, predicted_away, predicted_advances_team_id")
    .eq("user_id", user.id);

  const matchById = new Map((matches ?? []).map((m) => [m.id, m]));
  const groupMatches = (matches ?? []).filter((m) => m.phase === "group_stage");
  const knockoutMatches = (matches ?? []).filter((m) => m.phase !== "group_stage");

  const { data: teams } = await supabase
    .from("teams")
    .select("*");

  const groupResults = buildGroupResultsFromPredictions(
    groupMatches as Parameters<typeof buildGroupResultsFromPredictions>[0],
    (predictions ?? []) as Parameters<typeof buildGroupResultsFromPredictions>[1]
  );

  const advancingThirdGroups = resolveAdvancingThirdGroups(
    teams ?? [],
    groupResults,
    groupMatches.map((m) => m.id),
    (predictions ?? []) as Parameters<typeof resolveAdvancingThirdGroups>[3]
  );

  const groupPreds = (predictions ?? [])
    .filter((p) => matchById.get(p.match_id)?.phase === "group_stage")
    .map((p) => ({
      matchId: p.match_id,
      matchNumber: matchById.get(p.match_id)?.fifa_match_number ?? 0,
      phase: "group_stage",
      predictedHome: p.predicted_home,
      predictedAway: p.predicted_away,
    }));

  const knockoutPreds = (predictions ?? [])
    .filter((p) => matchById.get(p.match_id)?.phase !== "group_stage")
    .map((p) => ({
      matchId: p.match_id,
      matchNumber: matchById.get(p.match_id)?.fifa_match_number ?? 0,
      phase: matchById.get(p.match_id)?.phase ?? "",
      predictedHome: p.predicted_home,
      predictedAway: p.predicted_away,
      predictedAdvancesTeamId: p.predicted_advances_team_id,
    }));

  const validation = validateFullSubmission(
    {
      globalDeadline,
      alreadySubmitted: false,
      groupPredictions: groupPreds,
      knockoutPredictions: knockoutPreds,
      advancingThirdGroups,
      expectedGroupCount: groupMatches.length,
      expectedKnockoutCount: knockoutMatches.length,
    },
    { skipDeadlineCheck: isLateSubmissionWindowOpen(lateSubmissionUntil) }
  );

  if (!validation.valid) {
    throw new Error(validation.errors[0] ?? "validation_failed");
  }

  const now = new Date().toISOString();

  const { error: subErr } = await supabase.from("user_tournament_submissions").upsert(
    {
      user_id: user.id,
      is_complete: true,
      submitted_at: now,
    },
    { onConflict: "user_id" }
  );

  if (subErr) throw new Error(subErr.message);

  revalidatePath("/pronosticos");
  revalidatePath("/dashboard");
}

/** REGLAS §5 — paid prediction change (max 1 per day) */
export async function applyPaidPredictionChange(
  predictionId: string,
  newHome: number,
  newAway: number,
  phase: MatchPhase,
  opts?: { predictedAdvancesTeamId?: number | null }
) {
  const user = await requireUser();
  const supabase = await createClient();

  const globalDeadline = await getGlobalDeadlineIso();
  if (!isGlobalDeadlinePassed(globalDeadline)) {
    throw new Error("before_global_deadline");
  }

  const submitted = await getSubmissionState(user.id);
  if (!submitted) throw new Error("not_submitted_yet");

  await syncUserPredictionLockState(user.id);

  const maxPerDay = await getConfigNumber("changes.max_per_day", 1);
  const today = getTournamentTodayKey();

  const changesToday = await countPaidChangesToday(supabase, user.id);

  if (changesToday >= maxPerDay) {
    throw new Error("daily_limit_reached");
  }

  const home = clampScore(newHome);
  const away = clampScore(newAway);

  const { data: prediction } = await supabase
    .from("predictions")
    .select(
      "predicted_home, predicted_away, predicted_advances_team_id, match_id, locked"
    )
    .eq("id", predictionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!prediction) throw new Error("prediction_not_found");
  if (!prediction.locked) throw new Error("prediction_not_locked");

  const { data: match } = await supabase
    .from("matches")
    .select("prediction_deadline, status, phase, kickoff_at, home_score, away_score")
    .eq("id", prediction.match_id)
    .maybeSingle();

  if (!match) throw new Error("match_not_found");

  const eligibility = canPaidChangeMatch(match);
  if (!eligibility.allowed) {
    throw new Error(eligibility.reason ?? "match_locked");
  }

  const isKnockout = match.phase !== "group_stage";
  const isDraw = home === away;
  let advancesId = opts?.predictedAdvancesTeamId ?? null;
  if (isKnockout && isDraw && advancesId == null) {
    throw new Error("advance_team_required");
  }
  if (!isDraw) advancesId = null;

  const cost = await getPaidChangeCost((match.phase ?? phase) as MatchPhase);

  const { data: profile } = await supabase
    .from("profiles")
    .select("total_points")
    .eq("id", user.id)
    .single();

  if ((profile?.total_points ?? 0) < cost) {
    throw new Error("insufficient_points");
  }

  const { error: changeErr } = await supabase.from("prediction_changes").insert({
    user_id: user.id,
    prediction_id: predictionId,
    match_id: prediction.match_id,
    old_home: prediction.predicted_home,
    old_away: prediction.predicted_away,
    old_advances_team_id: prediction.predicted_advances_team_id,
    new_home: home,
    new_away: away,
    new_advances_team_id: advancesId,
    points_spent: cost,
    change_date: today,
  });

  if (changeErr) throw new Error(changeErr.message);

  const admin = createAdminClient();

  const { error: predErr } = await admin
    .from("predictions")
    .update({
      predicted_home: home,
      predicted_away: away,
      predicted_is_draw: isKnockout && isDraw,
      predicted_advances_team_id: advancesId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", predictionId)
    .eq("user_id", user.id);

  if (predErr) throw new Error(predErr.message);

  if (
    match.status === "finished" &&
    match.home_score != null &&
    match.away_score != null
  ) {
    await recalculateUserMatchPoints(admin, {
      userId: user.id,
      matchId: prediction.match_id,
      phase: (match.phase ?? phase) as MatchPhase,
      homeScore: match.home_score,
      awayScore: match.away_score,
    });
  } else {
    await recalculateUserTotalPoints(admin, user.id);
  }

  revalidateTag(CACHE_TAGS.leaderboard);
  revalidatePath("/dashboard");
  revalidatePath("/pronosticos");
  revalidatePath("/transparencia");
}

/** REGLAS §5 — free knockout adjustments when official third-place order differs */
export async function saveQualifierAdjustment(
  matchId: string,
  newHome: number,
  newAway: number,
  opts?: { predictedAdvancesTeamId?: number | null }
) {
  const user = await requireUser();
  const supabase = await createClient();

  const globalDeadline = await getGlobalDeadlineIso();
  if (!isGlobalDeadlinePassed(globalDeadline)) {
    throw new Error("before_global_deadline");
  }

  const submitted = await getSubmissionState(user.id);
  if (!submitted) throw new Error("not_submitted_yet");

  const windowState = await loadQualifierAdjustmentWindowState(supabase, user.id);
  if (!windowState.active) {
    throw new Error("qualifier_adjustment_closed");
  }
  if (!isQualifierAdjustmentMatch(windowState, matchId)) {
    throw new Error("match_not_affected");
  }

  const home = clampScore(newHome);
  const away = clampScore(newAway);

  const { data: match } = await supabase
    .from("matches")
    .select("id, phase, status, kickoff_at, prediction_deadline")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) throw new Error("match_not_found");
  if (match.phase === "group_stage") throw new Error("group_stage_not_allowed");

  const eligibility = canPaidChangeMatch(match);
  if (!eligibility.allowed) {
    throw new Error(eligibility.reason ?? "match_locked");
  }

  const isKnockout = true;
  const isDraw = home === away;
  let advancesId = opts?.predictedAdvancesTeamId ?? null;
  if (isKnockout && isDraw && advancesId == null) {
    throw new Error("advance_team_required");
  }
  if (!isDraw) advancesId = null;

  const { data: prediction } = await supabase
    .from("predictions")
    .select(
      "id, predicted_home, predicted_away, predicted_advances_team_id, locked"
    )
    .eq("user_id", user.id)
    .eq("match_id", matchId)
    .maybeSingle();

  if (!prediction) throw new Error("prediction_not_found");
  if (!prediction.locked) throw new Error("prediction_not_locked");

  const unchanged =
    prediction.predicted_home === home &&
    prediction.predicted_away === away &&
    (prediction.predicted_advances_team_id ?? null) === advancesId;
  if (unchanged) throw new Error("unchanged");

  const today = getTournamentTodayKey();

  const { error: changeErr } = await supabase.from("prediction_changes").insert({
    user_id: user.id,
    prediction_id: prediction.id,
    match_id: matchId,
    old_home: prediction.predicted_home,
    old_away: prediction.predicted_away,
    old_advances_team_id: prediction.predicted_advances_team_id,
    new_home: home,
    new_away: away,
    new_advances_team_id: advancesId,
    points_spent: 0,
    change_date: today,
  });

  if (changeErr) throw new Error(changeErr.message);

  const admin = createAdminClient();

  const { error: predErr } = await admin
    .from("predictions")
    .update({
      predicted_home: home,
      predicted_away: away,
      predicted_is_draw: isDraw,
      predicted_advances_team_id: advancesId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", prediction.id)
    .eq("user_id", user.id);

  if (predErr) throw new Error(predErr.message);

  revalidateTag(CACHE_TAGS.leaderboard);
  revalidatePath("/dashboard");
  revalidatePath("/pronosticos");
  revalidatePath("/transparencia");
}

export type PronosticosPayload = Awaited<ReturnType<typeof loadPronosticosData>>;

/** Server-side data loader for /pronosticos page */
export async function loadPronosticosData(userId: string) {
  const supabase = await createClient();
  const lockState = await syncUserPredictionLockState(userId);
  const payload = await fetchPronosticosPayload(supabase, userId);
  return { ...payload, ...lockState };
}
