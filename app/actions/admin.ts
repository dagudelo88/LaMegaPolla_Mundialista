"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { resolveOfficialBracket } from "@/lib/bracket/resolve-official-bracket";
import { processMatchResult } from "@/lib/scoring/process-match-result";
import { processJornadaBonus } from "@/lib/scoring/process-jornada-bonus";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { grantLateSubmissionAccess } from "@/lib/predictions/late-submission-access";

const REVALIDATE_PATHS = [
  "/admin",
  "/admin/resultados",
  "/admin/predicciones",
  "/transparencia",
  "/resultados",
  "/",
  "/dashboard",
  "/programacion",
  "/pronosticos",
  "/jugador",
] as const;

function revalidatePublicPaths() {
  revalidateTag(CACHE_TAGS.leaderboard);
  revalidateTag(CACHE_TAGS.fixture);
  revalidateTag(CACHE_TAGS.appConfig);
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

function clampScore(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 20) return 20;
  return Math.round(value);
}

export async function generateInviteCode() {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "MEGA-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  const { error } = await admin.from("invitation_codes").insert({
    code,
    created_by: user.id,
    max_uses: 1,
    uses_count: 0,
  });

  if (error) throw new Error(error.message);

  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action: "generate_invite_code",
    target_type: "invitation_codes",
    target_id: code,
    details: { code },
  });

  revalidatePath("/admin");
  return { code };
}

export async function setMatchLive(matchId: string) {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const { data: existing, error: fetchErr } = await admin
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .single();

  if (fetchErr || !existing) throw new Error(fetchErr?.message ?? "Partido no encontrado");

  const { error } = await admin
    .from("matches")
    .update({
      status: "live",
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  if (error) throw new Error(error.message);

  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action: "set_match_live",
    target_type: "matches",
    target_id: matchId,
    details: { previousStatus: existing.status },
  });

  revalidatePublicPaths();
}

export async function setMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
  advancesTeamId?: number | null
) {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const home = clampScore(homeScore);
  const away = clampScore(awayScore);

  const { data: existing, error: fetchErr } = await admin
    .from("matches")
    .select("phase, status, home_score, away_score, home_team_id, away_team_id, result_advances_team_id")
    .eq("id", matchId)
    .single();

  if (fetchErr || !existing) throw new Error(fetchErr?.message ?? "Partido no encontrado");

  const isKnockout = existing.phase !== "group_stage";
  const isDraw = home === away;
  let resultAdvancesTeamId: number | null = null;

  if (isKnockout && isDraw) {
    if (advancesTeamId == null) {
      throw new Error(
        "En eliminatorias con empate a 90 min debes indicar qué equipo avanza (penales / prórroga)."
      );
    }
    if (
      advancesTeamId !== existing.home_team_id &&
      advancesTeamId !== existing.away_team_id
    ) {
      throw new Error("El equipo que avanza debe ser local o visitante del partido.");
    }
    resultAdvancesTeamId = advancesTeamId;
  }

  const isCorrection = existing.status === "finished";
  if (
    isCorrection &&
    existing.home_score === home &&
    existing.away_score === away &&
    existing.result_advances_team_id === resultAdvancesTeamId
  ) {
    throw new Error("El resultado no cambió.");
  }

  const { error: updateErr } = await admin
    .from("matches")
    .update({
      home_score: home,
      away_score: away,
      status: "finished",
      result_advances_team_id: resultAdvancesTeamId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  if (updateErr) throw new Error(updateErr.message);

  const { usersScored } = await processMatchResult(admin, {
    matchId,
    phase: existing.phase as MatchPhase,
    homeScore: home,
    awayScore: away,
  });

  const jornadaBonus = await processJornadaBonus(admin, matchId);

  const bracket = await resolveOfficialBracket(admin);

  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action: isCorrection ? "correct_match_result" : "set_match_result",
    target_type: "matches",
    target_id: matchId,
    details: {
      previous: {
        homeScore: existing.home_score,
        awayScore: existing.away_score,
        status: existing.status,
        resultAdvancesTeamId: existing.result_advances_team_id,
      },
      current: {
        homeScore: home,
        awayScore: away,
        status: "finished",
        resultAdvancesTeamId: resultAdvancesTeamId,
      },
      usersScored,
      jornadaBonus,
      bracket,
    },
  });

  revalidatePublicPaths();
  return { usersScored, isCorrection, bracket, jornadaBonus };
}

export async function resolveOfficialKnockoutBracket() {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const result = await resolveOfficialBracket(admin);

  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action: "resolve_official_knockout_bracket",
    target_type: "matches",
    target_id: "knockout",
    details: result,
  });

  revalidatePublicPaths();
  return result;
}

export async function validateOfficialQualifiers() {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const { data: groupMatches, error: groupError } = await admin
    .from("matches")
    .select("id, status, home_score, away_score")
    .eq("phase", "group_stage");

  if (groupError) throw new Error(groupError.message);

  const groupStageComplete =
    (groupMatches ?? []).length === 72 &&
    (groupMatches ?? []).every(
      (match) =>
        match.status === "finished" &&
        match.home_score != null &&
        match.away_score != null
    );

  if (!groupStageComplete) {
    throw new Error("group_stage_not_complete");
  }

  const bracket = await resolveOfficialBracket(admin);
  const validatedAt = new Date().toISOString();

  const { error: configError } = await admin.from("app_config").upsert(
    [
      {
        key: "results.official_qualifiers_validated",
        value: true,
        description: "Indica si el administrador validó la lista oficial de clasificados a eliminatorias",
        updated_at: validatedAt,
      },
      {
        key: "results.official_qualifiers_validated_at",
        value: validatedAt,
        description: "Fecha de validación admin de clasificados oficiales a eliminatorias",
        updated_at: validatedAt,
      },
    ],
    { onConflict: "key" }
  );

  if (configError) throw new Error(configError.message);

  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action: "validate_official_qualifiers",
    target_type: "app_config",
    target_id: "results.official_qualifiers_validated",
    details: { validatedAt, bracket },
  });

  revalidatePublicPaths();
  return { validatedAt, bracket };
}

function nullableInteger(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value);
}

export async function updateTeamTieBreakMetadata(
  teamId: number,
  input: {
    teamConductScore?: number | null;
    fifaRanking?: number | null;
    manualTieBreakRank?: number | null;
  }
) {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const { data: team, error: fetchErr } = await admin
    .from("teams")
    .select("id, fifa_code, name_es, team_conduct_score, fifa_ranking, manual_tie_break_rank")
    .eq("id", teamId)
    .maybeSingle();

  if (fetchErr || !team) throw new Error(fetchErr?.message ?? "team_not_found");

  const next = {
    team_conduct_score:
      input.teamConductScore === undefined
        ? (team.team_conduct_score ?? 0)
        : (nullableInteger(input.teamConductScore) ?? 0),
    fifa_ranking:
      input.fifaRanking === undefined
        ? (team.fifa_ranking ?? null)
        : nullableInteger(input.fifaRanking),
    manual_tie_break_rank:
      input.manualTieBreakRank === undefined
        ? (team.manual_tie_break_rank ?? null)
        : nullableInteger(input.manualTieBreakRank),
  };

  const { error } = await admin
    .from("teams")
    .update(next)
    .eq("id", teamId);

  if (error) throw new Error(error.message);

  const now = new Date().toISOString();
  const { error: configError } = await admin.from("app_config").upsert(
    {
      key: "results.official_qualifiers_validated",
      value: false,
      description: "Indica si el administrador validó la lista oficial de clasificados a eliminatorias",
      updated_at: now,
    },
    { onConflict: "key" }
  );

  if (configError) throw new Error(configError.message);

  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action: "update_team_tiebreak_metadata",
    target_type: "teams",
    target_id: String(teamId),
    details: {
      team: { fifaCode: team.fifa_code, name: team.name_es },
      previous: {
        teamConductScore: team.team_conduct_score,
        fifaRanking: team.fifa_ranking,
        manualTieBreakRank: team.manual_tie_break_rank,
      },
      current: {
        teamConductScore: next.team_conduct_score,
        fifaRanking: next.fifa_ranking,
        manualTieBreakRank: next.manual_tie_break_rank,
      },
    },
  });

  revalidatePublicPaths();
  revalidatePath("/admin/resultados");
  return next;
}

export async function setPublicPredictionsEnabled(enabled: boolean) {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("app_config")
    .upsert(
      {
        key: "pool.public_predictions_enabled",
        value: enabled,
        description: "Permite a participantes ver pronósticos ajenos desde la tabla de posiciones",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

  if (error) throw new Error(error.message);

  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action: "set_public_predictions_enabled",
    target_type: "app_config",
    target_id: "pool.public_predictions_enabled",
    details: { enabled },
  });

  revalidatePublicPaths();
  revalidatePath("/admin");
}

export async function setParticipantEntryFeePaid(userId: string, paid: boolean) {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const { data: target, error: fetchErr } = await admin
    .from("profiles")
    .select("id, username, is_admin, withdrawn_at, entry_fee_paid")
    .eq("id", userId)
    .maybeSingle();

  if (fetchErr || !target) throw new Error(fetchErr?.message ?? "participant_not_found");
  if (target.is_admin) throw new Error("cannot_modify_admin");
  if (target.withdrawn_at) throw new Error("participant_withdrawn");

  const { error } = await admin
    .from("profiles")
    .update({ entry_fee_paid: paid })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action: paid ? "mark_entry_fee_paid" : "mark_entry_fee_unpaid",
    target_type: "profiles",
    target_id: userId,
    details: {
      username: target.username,
      previous: target.entry_fee_paid,
      current: paid,
    },
  });

  revalidatePublicPaths();
  revalidatePath("/admin");
}

export async function withdrawParticipant(userId: string) {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const { data: target, error: fetchErr } = await admin
    .from("profiles")
    .select("id, username, is_admin, withdrawn_at, entry_fee_paid")
    .eq("id", userId)
    .maybeSingle();

  if (fetchErr || !target) throw new Error(fetchErr?.message ?? "participant_not_found");
  if (target.is_admin) throw new Error("cannot_withdraw_admin");
  if (target.withdrawn_at) throw new Error("already_withdrawn");
  if (target.entry_fee_paid) throw new Error("cannot_withdraw_paid_participant");

  const now = new Date().toISOString();

  const { error: updateErr } = await admin
    .from("profiles")
    .update({
      withdrawn_at: now,
      withdrawn_by: user.id,
      total_points: 0,
    })
    .eq("id", userId);

  if (updateErr) throw new Error(updateErr.message);

  const { error: pointsErr } = await admin
    .from("user_match_points")
    .delete()
    .eq("user_id", userId);

  if (pointsErr) throw new Error(pointsErr.message);

  const { error: bonusErr } = await admin
    .from("user_jornada_bonus_points")
    .delete()
    .eq("user_id", userId);

  if (bonusErr) throw new Error(bonusErr.message);

  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action: "withdraw_participant",
    target_type: "profiles",
    target_id: userId,
    details: {
      username: target.username,
      entry_fee_paid: target.entry_fee_paid,
      withdrawn_at: now,
    },
  });

  revalidatePublicPaths();
  revalidatePath("/admin");
}

/** Grant a player extra time to save and submit after the global deadline. */
export async function grantLateSubmission(userId: string, untilIso?: string) {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const { data: target, error: fetchErr } = await admin
    .from("profiles")
    .select("id, username, withdrawn_at")
    .eq("id", userId)
    .maybeSingle();

  if (fetchErr || !target) throw new Error(fetchErr?.message ?? "participant_not_found");
  if (target.withdrawn_at) throw new Error("participant_withdrawn");

  const until =
    untilIso ??
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await grantLateSubmissionAccess(userId, until);

  await admin
    .from("profiles")
    .update({ late_submission_until: until })
    .eq("id", userId)
    .then(({ error }) => {
      if (error) {
        /* column may not exist until migration is applied */
      }
    });

  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action: "grant_late_submission",
    target_type: "profiles",
    target_id: userId,
    details: {
      username: target.username,
      late_submission_until: until,
    },
  });

  revalidatePublicPaths();
  revalidatePath("/admin");
  revalidatePath("/pronosticos");

  return { until };
}
