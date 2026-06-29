import type { BracketSlot } from "@/lib/bracket/types";
import { countPaidChangesToday } from "@/lib/changes/count-paid-changes-today";
import { DEFAULT_GLOBAL_DEADLINE } from "@/lib/config/tournament-deadline";
import { getConfig } from "@/lib/config/get-config";
import { buildJornadaMetaByKey } from "@/lib/jornada/build-jornada-meta";
import { isPredictionEditingClosed } from "@/lib/predictions/global-deadline";
import { getUserLateSubmissionUntil } from "@/lib/predictions/late-submission-access";
import { buildGroupResultsFromPredictions, resolveAdvancingThirdGroups } from "@/lib/predictions/helpers";
import { canPaidChangeMatch } from "@/lib/predictions/paid-change-eligibility";
import {
  loadQualifierAdjustmentWindowState,
  officialAdvancingThirdGroupsForWindow,
  qualifierAdjustmentAffectedByMatchId as buildQualifierAdjustmentAffectedByMatchId,
} from "@/lib/predictions/qualifier-adjustment-window";
import type { DbPrediction } from "@/lib/predictions/helpers";
import { loadScoringGateByMatchId } from "@/lib/scoring/load-scoring-gate-by-match";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchPronosticosPayload(supabase: SupabaseClient, userId: string) {
  const globalDeadline =
    (await getConfig<string>("tournament.global_deadline")) ?? DEFAULT_GLOBAL_DEADLINE;

  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .order("group_letter")
    .order("fifa_code");

  const { data: matchesRaw } = await supabase
    .from("matches")
    .select(
      "id, fifa_match_number, phase, group_letter, home_team_id, away_team_id, home_source, away_source, kickoff_at, fifa_schedule_date, prediction_deadline, status, home_score, away_score, venue, matchday_key"
    )
    .order("fifa_match_number");

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));
  const matches = (matchesRaw ?? []).map((m) => ({
    ...m,
    home_team: m.home_team_id ? teamMap.get(m.home_team_id) ?? null : null,
    away_team: m.away_team_id ? teamMap.get(m.away_team_id) ?? null : null,
  }));

  const paidChangeEligibleByMatchId: Record<string, boolean> = {};
  const paidChangeBlockReasonByMatchId: Record<
    string,
    import("@/lib/predictions/paid-change-eligibility").PaidChangeBlockReason
  > = {};
  for (const m of matches) {
    const eligibility = canPaidChangeMatch(m);
    paidChangeEligibleByMatchId[m.id] = eligibility.allowed;
    if (eligibility.reason) {
      paidChangeBlockReasonByMatchId[m.id] = eligibility.reason;
    }
  }

  const { data: predictions } = await supabase
    .from("predictions")
    .select(
      "id, match_id, predicted_home, predicted_away, predicted_is_draw, predicted_advances_team_id, locked, admin_overridden, admin_note"
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

  const lateSubmissionUntil = await getUserLateSubmissionUntil(userId);

  const changesToday = await countPaidChangesToday(supabase, userId);

  const { data: jornadaResults } = await supabase
    .from("jornada_results")
    .select("jornada_key, max_total_goals, winning_match_ids, is_tie, settled_at");

  const { data: userJornadaBonusPoints } = await supabase
    .from("user_jornada_bonus_points")
    .select("jornada_key, points")
    .eq("user_id", userId);

  const jornadaMetaByKey = buildJornadaMetaByKey({
    matches: matches ?? [],
    predictions: predictions ?? [],
    jornadaResults: jornadaResults ?? [],
    userJornadaBonusPoints: userJornadaBonusPoints ?? [],
  });

  const groupResults = buildGroupResultsFromPredictions(
    (matches ?? []) as Parameters<typeof buildGroupResultsFromPredictions>[0],
    (predictions ?? []) as Parameters<typeof buildGroupResultsFromPredictions>[1]
  );

  const groupMatchIds = (matches ?? [])
    .filter((m) => m.phase === "group_stage")
    .map((m) => m.id);

  const predictedAdvancingThirdGroups = resolveAdvancingThirdGroups(
    teams ?? [],
    groupResults,
    groupMatchIds,
    (predictions ?? []) as Parameters<typeof resolveAdvancingThirdGroups>[3]
  );

  const qualifierAdjustment = await loadQualifierAdjustmentWindowState(supabase, userId);
  const qualifierAdjustmentAffectedByMatchId = buildQualifierAdjustmentAffectedByMatchId(
    qualifierAdjustment
  );

  const groupMatchesOfficial = (matchesRaw ?? []).filter((m) => m.phase === "group_stage");
  const advancingThirdGroups = qualifierAdjustment.active
    ? officialAdvancingThirdGroupsForWindow(teams ?? [], groupMatchesOfficial)
    : predictedAdvancingThirdGroups;

  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name_es]));

  const scoringGateByMatchId = await loadScoringGateByMatchId(
    supabase,
    userId,
    (predictions ?? []) as DbPrediction[],
    teamNameById
  );

  const scoringGateByMatchIdWithNames = Object.fromEntries(
    Object.entries(scoringGateByMatchId).map(([matchId, gate]) => [
      matchId,
      {
        ...gate,
        blockedTeamNames: gate.blockedTeamIds.map(
          (id) => teamNameById.get(id) ?? String(id)
        ),
      },
    ])
  );

  return {
    globalDeadline,
    deadlinePassed: isPredictionEditingClosed(globalDeadline, lateSubmissionUntil),
    teams: teams ?? [],
    matches: matches ?? [],
    predictions: predictions ?? [],
    advancingThirdGroups,
    predictedAdvancingThirdGroups,
    qualifierAdjustment,
    qualifierAdjustmentAffectedByMatchId,
    isSubmitted: submission?.is_complete ?? false,
    submittedAt: submission?.submitted_at ?? null,
    totalPoints: profile?.total_points ?? 0,
    changesUsedToday: changesToday,
    paidChangeEligibleByMatchId,
    paidChangeBlockReasonByMatchId,
    jornadaResults: jornadaResults ?? [],
    userJornadaBonusPoints: userJornadaBonusPoints ?? [],
    jornadaMetaByKey,
    groupResults,
    knockoutDefs: (matches ?? [])
      .filter((m) => m.phase !== "group_stage")
      .map((m) => ({
        fifaMatchNumber: m.fifa_match_number ?? 0,
        phase: m.phase,
        homeSource: m.home_source as BracketSlot,
        awaySource: m.away_source as BracketSlot,
      })),
    scoringGateByMatchId: scoringGateByMatchIdWithNames,
  };
}
