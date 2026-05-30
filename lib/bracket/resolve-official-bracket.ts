import type { SupabaseClient } from "@supabase/supabase-js";
import { computeAllGroupStandings } from "@/lib/bracket/group-standings";
import { resolveKnockoutMatch } from "@/lib/bracket/knockout-resolver";
import {
  officialMatchLoser,
  officialMatchWinner,
  parseKnockoutDefs,
  type OfficialFinishedMatch,
} from "@/lib/bracket/official-knockout-resolver";
import { computeAdvancingThirdGroups } from "@/lib/bracket/third-place-advancement";
import type { TeamRef } from "@/lib/bracket/types";
import { buildOfficialGroupResults } from "@/lib/matches/official-results";

export interface ResolveOfficialBracketResult {
  updatedMatches: number;
  unresolvedMatches: number;
}

interface MatchRow {
  id: string;
  fifa_match_number: number | null;
  phase: string;
  home_team_id: number | null;
  away_team_id: number | null;
  home_source: unknown;
  away_source: unknown;
  home_score: number | null;
  away_score: number | null;
  status: string;
  result_advances_team_id: number | null;
}

export async function resolveOfficialBracket(
  admin: SupabaseClient
): Promise<ResolveOfficialBracketResult> {
  const [{ data: teams }, { data: matches }] = await Promise.all([
    admin.from("teams").select("id, fifa_code, group_letter"),
    admin
      .from("matches")
      .select(
        "id, fifa_match_number, phase, home_team_id, away_team_id, home_source, away_source, home_score, away_score, status, result_advances_team_id"
      )
      .order("fifa_match_number"),
  ]);

  if (!teams?.length || !matches?.length) {
    return { updatedMatches: 0, unresolvedMatches: 0 };
  }

  const teamRefs: TeamRef[] = teams.map((t) => ({
    id: t.id,
    fifaCode: t.fifa_code,
    groupLetter: t.group_letter,
  }));

  const groupResults = buildOfficialGroupResults(matches as MatchRow[]);
  const standings = computeAllGroupStandings(teamRefs, groupResults);
  const thirdGroups = computeAdvancingThirdGroups(standings);

  const finishedByNumber = new Map<number, OfficialFinishedMatch>();
  for (const m of matches as MatchRow[]) {
    if (m.phase === "group_stage" || m.status !== "finished") continue;
    if (m.fifa_match_number == null) continue;
    if (m.home_team_id == null || m.away_team_id == null) continue;
    if (m.home_score == null || m.away_score == null) continue;

    finishedByNumber.set(m.fifa_match_number, {
      fifaMatchNumber: m.fifa_match_number,
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      homeScore: m.home_score,
      awayScore: m.away_score,
      resultAdvancesTeamId: m.result_advances_team_id,
    });
  }

  const knockoutDefs = parseKnockoutDefs(matches as MatchRow[]).sort(
    (a, b) => a.fifaMatchNumber - b.fifaMatchNumber
  );

  const winners = new Map<number, number>();
  const losers = new Map<number, number>();
  let updatedMatches = 0;
  let unresolvedMatches = 0;

  for (const def of knockoutDefs) {
    const row = (matches as MatchRow[]).find(
      (m) => m.fifa_match_number === def.fifaMatchNumber
    );
    if (!row) continue;

    const resolved = resolveKnockoutMatch(
      def,
      teamRefs,
      groupResults,
      thirdGroups,
      winners,
      losers,
      { requireOfficialGroupCompletion: true }
    );

    if (resolved.unresolved) {
      unresolvedMatches += 1;
      if (row.home_team_id != null || row.away_team_id != null) {
        const { error } = await admin
          .from("matches")
          .update({
            home_team_id: null,
            away_team_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        if (error) throw new Error(error.message);
        updatedMatches += 1;
      }
    } else if (
      row.home_team_id !== resolved.homeTeamId ||
      row.away_team_id !== resolved.awayTeamId
    ) {
      const { error } = await admin
        .from("matches")
        .update({
          home_team_id: resolved.homeTeamId,
          away_team_id: resolved.awayTeamId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (error) throw new Error(error.message);
      updatedMatches += 1;
    }

    const finished = finishedByNumber.get(def.fifaMatchNumber);
    if (
      finished &&
      resolved.homeTeamId != null &&
      resolved.awayTeamId != null
    ) {
      const winner = officialMatchWinner(finished);
      const loser = officialMatchLoser(finished);
      if (winner != null) winners.set(def.fifaMatchNumber, winner);
      if (loser != null) losers.set(def.fifaMatchNumber, loser);
    }
  }

  return { updatedMatches, unresolvedMatches };
}
