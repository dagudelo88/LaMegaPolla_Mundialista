import type { BracketSlot } from "@/lib/bracket/types";
import { buildOfficialGroupResults } from "@/lib/matches/official-results";
import { buildGroupResultsFromPredictions } from "@/lib/predictions/helpers";
import {
  buildKnockoutPredictionsMap,
  computeThirdOrderAffectedMatchNumbers,
  mapAffectedNumbersToMatchIds,
} from "@/lib/predictions/qualifier-adjustment-affected";
import {
  advancingThirdGroupsFromRanked,
  rankThirdPlaceFromGroupResults,
  type ThirdPlaceTeamInput,
} from "@/lib/predictions/third-place-order";
import { getConfigBoolean } from "@/lib/config/get-config";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface QualifierAdjustmentWindowState {
  open: boolean;
  /** User has knockout crosses that change with official third-place order. */
  userAffected: boolean;
  /** User may edit affected knockout predictions for free during the window. */
  active: boolean;
  affectedMatchIds: string[];
  firstKnockoutKickoff: string | null;
  officialQualifiersValidatedAt: string | null;
}

export async function loadQualifierAdjustmentWindowState(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date()
): Promise<QualifierAdjustmentWindowState> {
  const empty: QualifierAdjustmentWindowState = {
    open: false,
    userAffected: false,
    active: false,
    affectedMatchIds: [],
    firstKnockoutKickoff: null,
    officialQualifiersValidatedAt: null,
  };

  const officialValidated = await getConfigBoolean(
    "results.official_qualifiers_validated",
    false
  );
  if (!officialValidated) return empty;

  const { data: configRow } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "results.official_qualifiers_validated_at")
    .maybeSingle();

  const { data: teams } = await supabase
    .from("teams")
    .select(
      "id, fifa_code, group_letter, fifa_ranking, team_conduct_score, manual_tie_break_rank"
    );

  const { data: groupMatches } = await supabase
    .from("matches")
    .select("id, phase, status, home_team_id, away_team_id, home_score, away_score, kickoff_at")
    .eq("phase", "group_stage");

  const { data: knockoutMatches } = await supabase
    .from("matches")
    .select("id, fifa_match_number, phase, home_source, away_source, kickoff_at")
    .neq("phase", "group_stage")
    .order("kickoff_at", { ascending: true });

  const firstKnockoutKickoff = knockoutMatches?.[0]?.kickoff_at ?? null;
  const open =
    firstKnockoutKickoff != null && now < new Date(firstKnockoutKickoff);

  const teamRows = (teams ?? []) as ThirdPlaceTeamInput[];
  const teamRefs = teamRows.map((t) => ({
    id: t.id,
    fifaCode: t.fifa_code,
    groupLetter: t.group_letter,
    fifaRanking: t.fifa_ranking ?? null,
    teamConductScore: t.team_conduct_score ?? 0,
    manualTieBreakRank: t.manual_tie_break_rank ?? null,
  }));

  const officialGroupResults = buildOfficialGroupResults(groupMatches ?? []);
  const officialRanked = rankThirdPlaceFromGroupResults(teamRows, officialGroupResults, {
    ignoreManualTieBreak: false,
  });
  const officialAdvancingThirdGroups = advancingThirdGroupsFromRanked(officialRanked);

  const { data: predictions } = await supabase
    .from("predictions")
    .select("match_id, predicted_home, predicted_away, predicted_advances_team_id")
    .eq("user_id", userId);

  const predictedGroupResults = buildGroupResultsFromPredictions(
    (groupMatches ?? []) as unknown as Parameters<typeof buildGroupResultsFromPredictions>[0],
    (predictions ?? []) as Parameters<typeof buildGroupResultsFromPredictions>[1]
  );
  const predictedRanked = rankThirdPlaceFromGroupResults(teamRows, predictedGroupResults, {
    ignoreManualTieBreak: true,
  });
  const predictedAdvancingThirdGroups = advancingThirdGroupsFromRanked(predictedRanked);

  const knockoutDefs = (knockoutMatches ?? [])
    .filter((m) => m.fifa_match_number != null)
    .map((m) => ({
      fifaMatchNumber: m.fifa_match_number!,
      phase: m.phase,
      homeSource: m.home_source as BracketSlot,
      awaySource: m.away_source as BracketSlot,
    }));

  const knockoutPredictions = buildKnockoutPredictionsMap(
    knockoutMatches ?? [],
    predictions ?? []
  );

  const affectedNumbers = computeThirdOrderAffectedMatchNumbers(
    knockoutDefs,
    teamRefs,
    predictedGroupResults,
    predictedAdvancingThirdGroups,
    officialAdvancingThirdGroups,
    knockoutPredictions
  );

  const affectedMatchIds = mapAffectedNumbersToMatchIds(
    knockoutMatches ?? [],
    affectedNumbers
  );

  const userAffected = affectedMatchIds.length > 0;

  return {
    open,
    userAffected,
    active: open && userAffected,
    affectedMatchIds,
    firstKnockoutKickoff,
    officialQualifiersValidatedAt:
      typeof configRow?.value === "string" ? configRow.value : null,
  };
}

export function officialAdvancingThirdGroupsForWindow(
  teams: ThirdPlaceTeamInput[],
  groupMatches: Array<{
    phase?: string;
    status: string;
    home_team_id: number | null;
    away_team_id: number | null;
    home_score: number | null;
    away_score: number | null;
  }>
): string[] {
  const officialGroupResults = buildOfficialGroupResults(
    groupMatches.map((m) => ({
      phase: m.phase ?? "group_stage",
      status: m.status,
      home_team_id: m.home_team_id,
      away_team_id: m.away_team_id,
      home_score: m.home_score,
      away_score: m.away_score,
    }))
  );
  const officialRanked = rankThirdPlaceFromGroupResults(teams, officialGroupResults, {
    ignoreManualTieBreak: false,
  });
  return advancingThirdGroupsFromRanked(officialRanked);
}

export function isQualifierAdjustmentMatch(
  state: QualifierAdjustmentWindowState,
  matchId: string
): boolean {
  return state.active && state.affectedMatchIds.includes(matchId);
}

export function qualifierAdjustmentAffectedByMatchId(
  state: QualifierAdjustmentWindowState
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (!state.active) return out;
  for (const id of state.affectedMatchIds) {
    out[id] = true;
  }
  return out;
}
