import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildGroupResultsFromPredictions,
  type DbMatchWithTeams,
  type DbPrediction,
  resolveAdvancingThirdGroups,
} from "@/lib/predictions/helpers";
import {
  validateFullSubmission,
  type SubmissionValidationInput,
  type SubmissionValidationResult,
} from "@/lib/predictions/submission-validator";

export interface UserSubmissionReadiness {
  ready: boolean;
  alreadySubmitted: boolean;
  validation: SubmissionValidationResult;
}

export function buildSubmissionValidationInput(params: {
  matches: DbMatchWithTeams[];
  predictions: DbPrediction[];
  teams: {
    id: number;
    fifa_code: string;
    group_letter: string;
    fifa_ranking?: number | null;
    team_conduct_score?: number | null;
    manual_tie_break_rank?: number | null;
  }[];
  globalDeadline: string;
  alreadySubmitted: boolean;
}): SubmissionValidationInput {
  const { matches, predictions, teams, globalDeadline, alreadySubmitted } = params;
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const groupMatches = matches.filter((m) => m.phase === "group_stage");
  const knockoutMatches = matches.filter((m) => m.phase !== "group_stage");

  const groupResults = buildGroupResultsFromPredictions(matches, predictions);
  const advancingThirdGroups = resolveAdvancingThirdGroups(
    teams,
    groupResults,
    groupMatches.map((m) => m.id),
    predictions
  );

  const groupPreds = predictions
    .filter((p) => matchById.get(p.match_id)?.phase === "group_stage")
    .map((p) => ({
      matchId: p.match_id,
      matchNumber: matchById.get(p.match_id)?.fifa_match_number ?? 0,
      phase: "group_stage",
      predictedHome: p.predicted_home,
      predictedAway: p.predicted_away,
    }));

  const knockoutPreds = predictions
    .filter((p) => matchById.get(p.match_id)?.phase !== "group_stage")
    .map((p) => ({
      matchId: p.match_id,
      matchNumber: matchById.get(p.match_id)?.fifa_match_number ?? 0,
      phase: matchById.get(p.match_id)?.phase ?? "",
      predictedHome: p.predicted_home,
      predictedAway: p.predicted_away,
      predictedAdvancesTeamId: p.predicted_advances_team_id,
    }));

  return {
    globalDeadline,
    alreadySubmitted,
    groupPredictions: groupPreds,
    knockoutPredictions: knockoutPreds,
    advancingThirdGroups,
    expectedGroupCount: groupMatches.length,
    expectedKnockoutCount: knockoutMatches.length,
  };
}

export function evaluateUserSubmissionReadiness(params: {
  matches: DbMatchWithTeams[];
  predictions: DbPrediction[];
  teams: {
    id: number;
    fifa_code: string;
    group_letter: string;
    fifa_ranking?: number | null;
    team_conduct_score?: number | null;
    manual_tie_break_rank?: number | null;
  }[];
  globalDeadline: string;
  alreadySubmitted: boolean;
  skipDeadlineCheck?: boolean;
}): UserSubmissionReadiness {
  const input = buildSubmissionValidationInput(params);
  const validation = validateFullSubmission(input, {
    skipDeadlineCheck: params.skipDeadlineCheck ?? false,
  });

  return {
    ready: validation.valid,
    alreadySubmitted: params.alreadySubmitted,
    validation,
  };
}

export async function loadUserSubmissionReadiness(
  admin: SupabaseClient,
  userId: string,
  globalDeadline: string,
  options?: { skipDeadlineCheck?: boolean }
): Promise<UserSubmissionReadiness> {
  const [{ data: matchesRaw }, { data: predictions }, { data: submission }] = await Promise.all([
    admin
      .from("matches")
      .select(
        "id, fifa_match_number, phase, group_letter, home_team_id, away_team_id, home_source, away_source, kickoff_at, prediction_deadline, status, venue"
      )
      .order("fifa_match_number"),
    admin
      .from("predictions")
      .select(
        "id, match_id, predicted_home, predicted_away, predicted_advances_team_id, predicted_is_draw, locked"
      )
      .eq("user_id", userId),
    admin
      .from("user_tournament_submissions")
      .select("is_complete, submitted_at")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const { data: teams } = await admin.from("teams").select("*");

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));
  const matches: DbMatchWithTeams[] = (matchesRaw ?? []).map((m) => ({
    ...m,
    home_team: m.home_team_id ? (teamMap.get(m.home_team_id) ?? null) : null,
    away_team: m.away_team_id ? (teamMap.get(m.away_team_id) ?? null) : null,
  }));

  const alreadySubmitted = submission?.is_complete ?? false;

  return evaluateUserSubmissionReadiness({
    matches,
    predictions: (predictions ?? []) as DbPrediction[],
    teams: teams ?? [],
    globalDeadline,
    alreadySubmitted,
    skipDeadlineCheck: options?.skipDeadlineCheck,
  });
}
