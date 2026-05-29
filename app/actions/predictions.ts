"use server";

import { requireUser } from "@/lib/auth/require-admin";
import { getPaidChangeCost } from "@/lib/changes/paid-change-cost";
import { getConfig } from "@/lib/config/get-config";
import { getConfigNumber } from "@/lib/config/get-config";
import type { BracketSlot } from "@/lib/bracket/types";
import { buildGroupResultsFromPredictions, resolveAdvancingThirdGroups } from "@/lib/predictions/helpers";
import { validateFullSubmission } from "@/lib/predictions/submission-validator";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { revalidatePath } from "next/cache";

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

  const submitted = await getSubmissionState(user.id);
  if (submitted) {
    throw new Error("already_submitted");
  }

  const home = clampScore(newHome);
  const away = clampScore(newAway);

  const { data: match } = await supabase
    .from("matches")
    .select("id, phase, prediction_deadline, status")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) throw new Error("match_not_found");

  const globalDeadline = await getConfig<string>("tournament.global_deadline");
  if (globalDeadline && new Date() >= new Date(globalDeadline)) {
    throw new Error("deadline_passed");
  }

  if (match.status !== "scheduled" || new Date() > new Date(match.prediction_deadline)) {
    throw new Error("match_locked");
  }

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

  const globalDeadline = (await getConfig<string>("tournament.global_deadline")) ?? "2026-06-11T00:00:00Z";

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
    .select("id, fifa_code, group_letter");

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

  const validation = validateFullSubmission({
    globalDeadline,
    alreadySubmitted: false,
    groupPredictions: groupPreds,
    knockoutPredictions: knockoutPreds,
    advancingThirdGroups,
    expectedGroupCount: groupMatches.length,
    expectedKnockoutCount: knockoutMatches.length,
  });

  if (!validation.valid) {
    throw new Error(validation.errors[0] ?? "validation_failed");
  }

  const now = new Date().toISOString();

  const { error: lockErr } = await supabase
    .from("predictions")
    .update({ locked: true, updated_at: now })
    .eq("user_id", user.id);

  if (lockErr) throw new Error(lockErr.message);

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

  const submitted = await getSubmissionState(user.id);
  if (!submitted) throw new Error("not_submitted_yet");

  const maxPerDay = await getConfigNumber("changes.max_per_day", 1);
  const today = new Date().toISOString().slice(0, 10);

  const { count } = await supabase
    .from("prediction_changes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("change_date", today);

  if ((count ?? 0) >= maxPerDay) {
    throw new Error("daily_limit_reached");
  }

  const home = clampScore(newHome);
  const away = clampScore(newAway);

  const { data: prediction } = await supabase
    .from("predictions")
    .select("predicted_home, predicted_away, match_id, locked")
    .eq("id", predictionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!prediction) throw new Error("prediction_not_found");
  if (!prediction.locked) throw new Error("prediction_not_locked");

  const { data: match } = await supabase
    .from("matches")
    .select("prediction_deadline, status, phase")
    .eq("id", prediction.match_id)
    .maybeSingle();

  if (!match) throw new Error("match_not_found");

  if (match.status !== "scheduled" || new Date() > new Date(match.prediction_deadline)) {
    throw new Error("match_locked");
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
    old_home: prediction.predicted_home,
    old_away: prediction.predicted_away,
    new_home: home,
    new_away: away,
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

  const { error: ptsErr } = await admin
    .from("profiles")
    .update({ total_points: (profile?.total_points ?? 0) - cost })
    .eq("id", user.id);

  if (ptsErr) throw new Error(ptsErr.message);

  revalidatePath("/dashboard");
  revalidatePath("/pronosticos");
}

export type PronosticosPayload = Awaited<ReturnType<typeof loadPronosticosData>>;

/** Server-side data loader for /pronosticos page */
export async function loadPronosticosData(userId: string) {
  const supabase = await createClient();

  const globalDeadline =
    (await getConfig<string>("tournament.global_deadline")) ?? "2026-06-11T00:00:00Z";

  const { data: teams } = await supabase
    .from("teams")
    .select("id, fifa_code, name_es, name_en, group_letter, flag_emoji")
    .order("group_letter")
    .order("fifa_code");

  const { data: matchesRaw } = await supabase
    .from("matches")
    .select(
      "id, fifa_match_number, phase, group_letter, home_team_id, away_team_id, home_source, away_source, kickoff_at, prediction_deadline, status, venue, matchday_key"
    )
    .order("fifa_match_number");

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));
  const matches = (matchesRaw ?? []).map((m) => ({
    ...m,
    home_team: m.home_team_id ? teamMap.get(m.home_team_id) ?? null : null,
    away_team: m.away_team_id ? teamMap.get(m.away_team_id) ?? null : null,
  }));

  const { data: predictions } = await supabase
    .from("predictions")
    .select(
      "id, match_id, predicted_home, predicted_away, predicted_is_draw, predicted_advances_team_id, locked"
    )
    .eq("user_id", userId);

  const { data: submission } = await supabase
    .from("user_tournament_submissions")
    .select("is_complete, submitted_at")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("total_points")
    .eq("id", userId)
    .single();

  const { count: changesToday } = await supabase
    .from("prediction_changes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("change_date", new Date().toISOString().slice(0, 10));

  const groupResults = buildGroupResultsFromPredictions(
    (matches ?? []) as Parameters<typeof buildGroupResultsFromPredictions>[0],
    (predictions ?? []) as Parameters<typeof buildGroupResultsFromPredictions>[1]
  );

  const groupMatchIds = (matches ?? [])
    .filter((m) => m.phase === "group_stage")
    .map((m) => m.id);

  const advancingThirdGroups = resolveAdvancingThirdGroups(
    teams ?? [],
    groupResults,
    groupMatchIds,
    (predictions ?? []) as Parameters<typeof resolveAdvancingThirdGroups>[3]
  );

  return {
    globalDeadline,
    teams: teams ?? [],
    matches: matches ?? [],
    predictions: predictions ?? [],
    advancingThirdGroups,
    isSubmitted: submission?.is_complete ?? false,
    submittedAt: submission?.submitted_at ?? null,
    totalPoints: profile?.total_points ?? 0,
    changesUsedToday: changesToday ?? 0,
    groupResults,
    knockoutDefs: (matches ?? [])
      .filter((m) => m.phase !== "group_stage")
      .map((m) => ({
        fifaMatchNumber: m.fifa_match_number ?? 0,
        phase: m.phase,
        homeSource: m.home_source as BracketSlot,
        awaySource: m.away_source as BracketSlot,
      })),
  };
}
