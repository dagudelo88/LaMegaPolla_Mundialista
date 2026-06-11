"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { recalculateUserMatchPoints } from "@/lib/scoring/process-user-match-points";
import type { BracketSlot } from "@/lib/bracket/types";
import { getConfig } from "@/lib/config/get-config";
import { DEFAULT_GLOBAL_DEADLINE } from "@/lib/config/tournament-deadline";
import {
  evaluateUserSubmissionReadiness,
  loadUserSubmissionReadiness,
} from "@/lib/predictions/submission-readiness";
import { buildGroupResultsFromPredictions, countProgress, resolveAdvancingThirdGroups } from "@/lib/predictions/helpers";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";

const REVALIDATE_PATHS = [
  "/admin",
  "/admin/predicciones",
  "/transparencia",
  "/pronosticos",
  "/dashboard",
  "/",
] as const;

function revalidateAll() {
  revalidateTag(CACHE_TAGS.leaderboard);
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

function clampScore(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 20) return 20;
  return Math.round(value);
}

function validateAdminNote(note: string): string {
  const trimmed = note.trim();
  if (trimmed.length < 10) {
    throw new Error("admin_note_too_short");
  }
  return trimmed;
}

async function getGlobalDeadline(): Promise<string> {
  return (await getConfig<string>("tournament.global_deadline")) ?? DEFAULT_GLOBAL_DEADLINE;
}

export async function loadAdminPredictionsPageData() {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: profiles }, { data: submissions }, { data: recentOverrides }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, username, total_points, joined_at, is_admin, role")
        .not("invite_redeemed_at", "is", null)
        .order("username"),
      admin.from("user_tournament_submissions").select("user_id, is_complete"),
      admin
        .from("prediction_admin_overrides")
        .select("id, created_at, user_id, match_id, admin_note")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const submittedIds = new Set(
    (submissions ?? []).filter((s) => s.is_complete).map((s) => s.user_id)
  );

  return {
    participants: (profiles ?? []).map((p) => ({
      id: p.id,
      username: p.username ?? "—",
      totalPoints: p.total_points,
      isSubmitted: submittedIds.has(p.id),
    })),
    recentOverrides: recentOverrides ?? [],
  };
}

export async function loadAdminUserPredictions(userId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: profile }, { data: teams }, { data: matchesRaw }, { data: predictions }, { data: submission }, { data: overrideHistory }] =
    await Promise.all([
      admin.from("profiles").select("id, username, total_points").eq("id", userId).single(),
      admin
        .from("teams")
        .select("*")
        .order("group_letter")
        .order("fifa_code"),
      admin
        .from("matches")
        .select(
          "id, fifa_match_number, phase, group_letter, home_team_id, away_team_id, home_source, away_source, kickoff_at, fifa_schedule_date, prediction_deadline, status, venue, matchday_key, home_score, away_score"
        )
        .order("fifa_match_number"),
      admin
        .from("predictions")
        .select(
          "id, user_id, match_id, predicted_home, predicted_away, predicted_is_draw, predicted_advances_team_id, locked, admin_overridden, admin_note"
        )
        .eq("user_id", userId),
      admin
        .from("user_tournament_submissions")
        .select("is_complete, submitted_at")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("prediction_admin_overrides")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

  if (!profile) throw new Error("user_not_found");

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));
  const matches = (matchesRaw ?? []).map((m) => ({
    ...m,
    home_team: m.home_team_id ? teamMap.get(m.home_team_id) ?? null : null,
    away_team: m.away_team_id ? teamMap.get(m.away_team_id) ?? null : null,
  }));

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

  const globalDeadline = await getGlobalDeadline();
  const submissionReadiness = evaluateUserSubmissionReadiness({
    matches: matches as Parameters<typeof evaluateUserSubmissionReadiness>[0]["matches"],
    predictions: (predictions ?? []) as Parameters<
      typeof evaluateUserSubmissionReadiness
    >[0]["predictions"],
    teams: teams ?? [],
    globalDeadline,
    alreadySubmitted: submission?.is_complete ?? false,
    skipDeadlineCheck: true,
  });

  const submissionProgress = countProgress(
    groupMatchIds,
    (matches ?? []).filter((m) => m.phase !== "group_stage").map((m) => m.id),
    (predictions ?? []) as Parameters<typeof countProgress>[2]
  );

  return {
    profile: {
      id: profile.id,
      username: profile.username ?? "—",
      totalPoints: profile.total_points,
    },
    teams: teams ?? [],
    matches,
    predictions: predictions ?? [],
    groupResults,
    isSubmitted: submission?.is_complete ?? false,
    submittedAt: submission?.submitted_at ?? null,
    advancingThirdGroups,
    overrideHistory: overrideHistory ?? [],
    submissionReadiness,
    submissionProgress,
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

export async function adminOverridePrediction(input: {
  userId: string;
  matchId: string;
  newHome: number;
  newAway: number;
  newAdvancesTeamId?: number | null;
  adminNote: string;
}) {
  const { user } = await requireAdmin();
  const admin = createAdminClient();
  const adminNote = validateAdminNote(input.adminNote);

  const home = clampScore(input.newHome);
  const away = clampScore(input.newAway);

  const { data: match, error: matchErr } = await admin
    .from("matches")
    .select("id, phase, status, home_team_id, away_team_id, home_score, away_score, fifa_match_number")
    .eq("id", input.matchId)
    .single();

  if (matchErr || !match) throw new Error(matchErr?.message ?? "Partido no encontrado");

  const isKnockout = match.phase !== "group_stage";
  const isDraw = home === away;
  let advancesId: number | null = null;

  if (isKnockout && isDraw) {
    if (input.newAdvancesTeamId == null) {
      throw new Error("En eliminatorias con empate debes indicar qué equipo avanza.");
    }
    if (
      input.newAdvancesTeamId !== match.home_team_id &&
      input.newAdvancesTeamId !== match.away_team_id
    ) {
      throw new Error("El equipo que avanza debe ser local o visitante del partido.");
    }
    advancesId = input.newAdvancesTeamId;
  }

  const { data: existing } = await admin
    .from("predictions")
    .select("id, predicted_home, predicted_away, predicted_advances_team_id, locked")
    .eq("user_id", input.userId)
    .eq("match_id", input.matchId)
    .maybeSingle();

  const { data: submission } = await admin
    .from("user_tournament_submissions")
    .select("is_complete")
    .eq("user_id", input.userId)
    .maybeSingle();

  const shouldLock = existing?.locked ?? submission?.is_complete ?? false;

  const oldHome = existing?.predicted_home ?? null;
  const oldAway = existing?.predicted_away ?? null;
  const oldAdvances = existing?.predicted_advances_team_id ?? null;

  if (
    existing &&
    oldHome === home &&
    oldAway === away &&
    oldAdvances === advancesId
  ) {
    throw new Error("El pronóstico no cambió.");
  }

  const now = new Date().toISOString();
  const predictionPayload = {
    user_id: input.userId,
    match_id: input.matchId,
    predicted_home: home,
    predicted_away: away,
    predicted_is_draw: isKnockout && isDraw,
    predicted_advances_team_id: advancesId,
    locked: shouldLock,
    admin_overridden: true,
    admin_note: adminNote,
    updated_at: now,
  };

  let predictionId = existing?.id ?? null;

  if (existing) {
    const { error: updateErr } = await admin
      .from("predictions")
      .update(predictionPayload)
      .eq("id", existing.id);
    if (updateErr) throw new Error(updateErr.message);
  } else {
    const { data: inserted, error: insertErr } = await admin
      .from("predictions")
      .insert({ ...predictionPayload, locked: shouldLock })
      .select("id")
      .single();
    if (insertErr) throw new Error(insertErr.message);
    predictionId = inserted.id;
  }

  const { error: logErr } = await admin.from("prediction_admin_overrides").insert({
    admin_id: user.id,
    user_id: input.userId,
    prediction_id: predictionId,
    match_id: input.matchId,
    old_home: oldHome,
    old_away: oldAway,
    old_advances_team_id: oldAdvances,
    new_home: home,
    new_away: away,
    new_advances_team_id: advancesId,
    admin_note: adminNote,
  });

  if (logErr) throw new Error(logErr.message);

  let pointsRecalculated = false;
  if (
    match.status === "finished" &&
    match.home_score != null &&
    match.away_score != null
  ) {
    await recalculateUserMatchPoints(admin, {
      userId: input.userId,
      matchId: input.matchId,
      phase: match.phase as MatchPhase,
      homeScore: match.home_score,
      awayScore: match.away_score,
    });
    pointsRecalculated = true;
  }

  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action: "override_prediction",
    target_type: "predictions",
    target_id: predictionId ?? input.matchId,
    details: {
      userId: input.userId,
      matchId: input.matchId,
      previous: { home: oldHome, away: oldAway, advancesTeamId: oldAdvances },
      current: { home, away, advancesTeamId: advancesId },
      adminNote,
      pointsRecalculated,
    },
  });

  revalidateAll();
  return { pointsRecalculated };
}

export async function adminSubmitUserPredictions(userId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const globalDeadline = await getGlobalDeadline();

  const readiness = await loadUserSubmissionReadiness(admin, userId, globalDeadline, {
    skipDeadlineCheck: true,
  });

  if (readiness.alreadySubmitted) {
    throw new Error("already_submitted");
  }

  if (!readiness.ready) {
    throw new Error(readiness.validation.errors[0] ?? "submission_incomplete");
  }

  const now = new Date().toISOString();
  const { error } = await admin.from("user_tournament_submissions").upsert(
    {
      user_id: userId,
      is_complete: true,
      submitted_at: now,
    },
    { onConflict: "user_id" }
  );

  if (error) throw new Error(error.message);

  revalidateAll();
  return { submittedAt: now };
}

export async function adminSubmitAllCompletePredictions(): Promise<{
  submitted: { userId: string; username: string }[];
  skipped: { userId: string; username: string; reason: string }[];
}> {
  await requireAdmin();
  const admin = createAdminClient();
  const globalDeadline = await getGlobalDeadline();

  const [{ data: profiles }, { data: submissions }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, username")
      .not("invite_redeemed_at", "is", null)
      .not("username", "is", null),
    admin.from("user_tournament_submissions").select("user_id, is_complete"),
  ]);

  const submittedIds = new Set(
    (submissions ?? []).filter((s) => s.is_complete).map((s) => s.user_id)
  );

  const pending = (profiles ?? []).filter((p) => !submittedIds.has(p.id));
  const submitted: { userId: string; username: string }[] = [];
  const skipped: { userId: string; username: string; reason: string }[] = [];

  for (const profile of pending) {
    const username = profile.username ?? "—";
    try {
      const readiness = await loadUserSubmissionReadiness(admin, profile.id, globalDeadline, {
        skipDeadlineCheck: true,
      });

      if (!readiness.ready) {
        skipped.push({
          userId: profile.id,
          username,
          reason: readiness.validation.errors[0] ?? "submission_incomplete",
        });
        continue;
      }

      const now = new Date().toISOString();
      const { error } = await admin.from("user_tournament_submissions").upsert(
        {
          user_id: profile.id,
          is_complete: true,
          submitted_at: now,
        },
        { onConflict: "user_id" }
      );

      if (error) {
        skipped.push({ userId: profile.id, username, reason: error.message });
        continue;
      }

      submitted.push({ userId: profile.id, username });
    } catch (e) {
      skipped.push({
        userId: profile.id,
        username,
        reason: e instanceof Error ? e.message : "unknown_error",
      });
    }
  }

  if (submitted.length > 0) {
    revalidateAll();
  }

  return { submitted, skipped };
}

export async function loadAdminSubmitReadyUsers(): Promise<
  { userId: string; username: string }[]
> {
  await requireAdmin();
  const admin = createAdminClient();
  const globalDeadline = await getGlobalDeadline();

  const [{ data: profiles }, { data: submissions }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, username")
      .not("invite_redeemed_at", "is", null)
      .not("username", "is", null),
    admin.from("user_tournament_submissions").select("user_id, is_complete"),
  ]);

  const submittedIds = new Set(
    (submissions ?? []).filter((s) => s.is_complete).map((s) => s.user_id)
  );

  const ready: { userId: string; username: string }[] = [];

  for (const profile of profiles ?? []) {
    if (submittedIds.has(profile.id) || !profile.username) continue;

    const readiness = await loadUserSubmissionReadiness(admin, profile.id, globalDeadline, {
      skipDeadlineCheck: true,
    });

    if (readiness.ready) {
      ready.push({ userId: profile.id, username: profile.username });
    }
  }

  return ready;
}
