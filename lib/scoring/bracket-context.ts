import type { SupabaseClient } from "@supabase/supabase-js";
import { areAllGroupsComplete } from "@/lib/bracket/group-completion";
import { computeAllGroupStandings } from "@/lib/bracket/group-standings";
import {
  resolveAllKnockoutMatches,
  resolveKnockoutMatch,
} from "@/lib/bracket/knockout-resolver";
import {
  buildOfficialKnockoutWinnerMaps,
  officialMatchWinner,
  parseKnockoutDefs,
  type OfficialFinishedMatch,
} from "@/lib/bracket/official-knockout-resolver";
import {
  computeAdvancingThirdGroups,
  resolveThirdPlaceScenarioTeams,
} from "@/lib/bracket/third-place-advancement";
import type {
  GroupMatchResult,
  KnockoutMatchDef,
  TeamRef,
} from "@/lib/bracket/types";
import { buildOfficialGroupResults } from "@/lib/matches/official-results";
import {
  buildGroupResultsFromPredictions,
  buildKnockoutPredictionsMap,
  type DbMatchWithTeams,
  type DbPrediction,
} from "@/lib/predictions/helpers";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { KNOCKOUT_PHASES } from "@/lib/scoring/knockout-phase-order";

export interface MatchMetaRow {
  id: string;
  fifa_match_number: number | null;
  phase: string;
  group_letter: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_source: unknown;
  away_source: unknown;
  home_score: number | null;
  away_score: number | null;
  status: string;
  result_advances_team_id: number | null;
  kickoff_at?: string;
  prediction_deadline?: string;
  fifa_schedule_date?: string;
}

export interface BracketContext {
  teams: TeamRef[];
  matches: MatchMetaRow[];
  knockoutDefs: KnockoutMatchDef[];
  matchById: Map<string, MatchMetaRow>;
  matchByNumber: Map<number, MatchMetaRow>;
  officialGroupResults: GroupMatchResult[];
  officialKnockoutResolved: Map<number, { homeTeamId: number | null; awayTeamId: number | null }>;
  officialTeamsByPhase: Map<MatchPhase, Set<number>>;
  officialQualifiedToKnockout: Set<number>;
}

export async function loadBracketContext(admin: SupabaseClient): Promise<BracketContext> {
  const [{ data: teamsRaw }, { data: matchesRaw }] = await Promise.all([
    admin.from("teams").select("*"),
    admin
      .from("matches")
      .select(
        "id, fifa_match_number, phase, group_letter, home_team_id, away_team_id, home_source, away_source, home_score, away_score, status, result_advances_team_id, kickoff_at, prediction_deadline, fifa_schedule_date"
      )
      .order("fifa_match_number"),
  ]);

  const teams: TeamRef[] = (teamsRaw ?? []).map((t) => ({
    id: t.id,
    fifaCode: t.fifa_code,
    groupLetter: t.group_letter,
    fifaRanking: t.fifa_ranking ?? null,
    teamConductScore: t.team_conduct_score ?? 0,
    manualTieBreakRank: t.manual_tie_break_rank ?? null,
  }));

  const matches = (matchesRaw ?? []) as MatchMetaRow[];
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const matchByNumber = new Map(
    matches.filter((m) => m.fifa_match_number != null).map((m) => [m.fifa_match_number!, m])
  );

  const knockoutDefs = parseKnockoutDefs(matches);
  const officialGroupResults = buildOfficialGroupResults(matches);
  const finishedKnockout = buildOfficialFinishedKnockout(matches);
  const finishedByNumber = new Map(finishedKnockout.map((m) => [m.fifaMatchNumber, m]));

  const standings = computeAllGroupStandings(teams, officialGroupResults);
  const thirdGroups = computeAdvancingThirdGroups(standings);
  const thirdPlaceTeamByMatch = resolveThirdPlaceScenarioTeams(standings, thirdGroups);

  const { winners, losers } = buildOfficialKnockoutWinnerMaps(finishedKnockout);
  const officialKnockoutResolved = resolveOfficialKnockoutTeams(
    knockoutDefs,
    teams,
    officialGroupResults,
    thirdGroups,
    winners,
    losers,
    finishedByNumber,
    thirdPlaceTeamByMatch
  );

  const officialTeamsByPhase = new Map<MatchPhase, Set<number>>();
  for (const phase of KNOCKOUT_PHASES) {
    officialTeamsByPhase.set(phase, new Set());
  }
  for (const def of knockoutDefs) {
    const teamsForMatch = officialKnockoutResolved.get(def.fifaMatchNumber);
    const phase = def.phase as MatchPhase;
    const set = officialTeamsByPhase.get(phase);
    if (!set || !teamsForMatch) continue;
    if (teamsForMatch.homeTeamId != null) set.add(teamsForMatch.homeTeamId);
    if (teamsForMatch.awayTeamId != null) set.add(teamsForMatch.awayTeamId);
  }

  const officialQualifiedToKnockout = officialTeamsByPhase.get("round_of_32") ?? new Set<number>();

  return {
    teams,
    matches,
    knockoutDefs,
    matchById,
    matchByNumber,
    officialGroupResults,
    officialKnockoutResolved,
    officialTeamsByPhase,
    officialQualifiedToKnockout,
  };
}

function resolveOfficialKnockoutTeams(
  knockoutDefs: KnockoutMatchDef[],
  teams: TeamRef[],
  groupResults: GroupMatchResult[],
  advancingThirdGroups: string[],
  initialWinners: Map<number, number>,
  initialLosers: Map<number, number>,
  finishedByNumber: Map<number, OfficialFinishedMatch>,
  thirdPlaceTeamByMatch: Map<number, number>
): Map<number, { homeTeamId: number | null; awayTeamId: number | null }> {
  const winners = new Map(initialWinners);
  const losers = new Map(initialLosers);
  const resolved = new Map<number, { homeTeamId: number | null; awayTeamId: number | null }>();
  const sorted = [...knockoutDefs].sort((a, b) => a.fifaMatchNumber - b.fifaMatchNumber);

  for (const def of sorted) {
    const teamsForMatch = resolveKnockoutMatch(
      def,
      teams,
      groupResults,
      advancingThirdGroups,
      winners,
      losers,
      { requireOfficialGroupCompletion: true, thirdPlaceTeamByMatch }
    );

    resolved.set(def.fifaMatchNumber, {
      homeTeamId: teamsForMatch.homeTeamId,
      awayTeamId: teamsForMatch.awayTeamId,
    });

    const finished = finishedByNumber.get(def.fifaMatchNumber);
    if (
      finished &&
      teamsForMatch.homeTeamId != null &&
      teamsForMatch.awayTeamId != null
    ) {
      const winner = officialMatchWinner(finished);
      const loser =
        winner != null
          ? winner === finished.homeTeamId
            ? finished.awayTeamId
            : finished.homeTeamId
          : null;
      if (winner != null) winners.set(def.fifaMatchNumber, winner);
      if (loser != null) losers.set(def.fifaMatchNumber, loser);
    }
  }

  return resolved;
}

export function resolveUserKnockoutTeams(
  ctx: BracketContext,
  predictions: DbPrediction[],
  matches: DbMatchWithTeams[]
): Map<number, { homeTeamId: number | null; awayTeamId: number | null }> {
  const groupResults = buildGroupResultsFromPredictions(matches, predictions);
  const knockoutPredictions = buildKnockoutPredictionsMap(matches, predictions);
  const standings = computeAllGroupStandings(ctx.teams, groupResults);
  const thirdGroups = computeAdvancingThirdGroups(standings);

  const resolved = resolveAllKnockoutMatches(
    ctx.knockoutDefs,
    ctx.teams,
    groupResults,
    thirdGroups,
    knockoutPredictions
  );

  const out = new Map<number, { homeTeamId: number | null; awayTeamId: number | null }>();
  for (const [num, teams] of resolved) {
    out.set(num, { homeTeamId: teams.homeTeamId, awayTeamId: teams.awayTeamId });
  }
  return out;
}

export function teamsInPhase(
  resolved: Map<number, { homeTeamId: number | null; awayTeamId: number | null }>,
  knockoutDefs: KnockoutMatchDef[],
  phase: MatchPhase
): Set<number> {
  const set = new Set<number>();
  for (const def of knockoutDefs) {
    if (def.phase !== phase) continue;
    const t = resolved.get(def.fifaMatchNumber);
    if (!t) continue;
    if (t.homeTeamId != null) set.add(t.homeTeamId);
    if (t.awayTeamId != null) set.add(t.awayTeamId);
  }
  return set;
}

export function isRoundComplete(ctx: BracketContext, roundKey: string): boolean {
  if (roundKey === "group_stage") {
    return areAllGroupsComplete(ctx.teams, ctx.officialGroupResults);
  }

  const phaseMatches = ctx.matches.filter((m) => m.phase === roundKey);
  if (!phaseMatches.length) return false;

  return phaseMatches.every(
    (m) => m.status === "finished" && m.home_score != null && m.away_score != null
  );
}

export function buildOfficialFinishedKnockout(matches: MatchMetaRow[]): OfficialFinishedMatch[] {
  const out: OfficialFinishedMatch[] = [];
  for (const m of matches) {
    if (m.phase === "group_stage" || m.status !== "finished") continue;
    if (m.fifa_match_number == null || m.home_team_id == null || m.away_team_id == null) continue;
    if (m.home_score == null || m.away_score == null) continue;
    out.push({
      fifaMatchNumber: m.fifa_match_number,
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      homeScore: m.home_score,
      awayScore: m.away_score,
      resultAdvancesTeamId: m.result_advances_team_id,
    });
  }
  return out;
}
