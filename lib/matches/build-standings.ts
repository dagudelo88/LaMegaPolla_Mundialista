import { computeAllGroupStandings } from "@/lib/bracket/group-standings";
import {
  computeAdvancingThirdGroups,
  rankAllThirdPlaceTeams,
} from "@/lib/bracket/third-place-advancement";
import { buildOfficialGroupResults, type OfficialMatchRow } from "@/lib/matches/official-results";

export function buildOfficialStandings(
  teams: Array<{
    id: number;
    fifa_code: string;
    name_es: string;
    group_letter: string;
    fifa_ranking?: number | null;
    team_conduct_score?: number | null;
    manual_tie_break_rank?: number | null;
  }>,
  matches: OfficialMatchRow[]
) {
  const results = buildOfficialGroupResults(matches);
  const teamRefs = teams.map((t) => ({
    id: t.id,
    fifaCode: t.fifa_code,
    groupLetter: t.group_letter,
    fifaRanking: t.fifa_ranking ?? null,
    teamConductScore: t.team_conduct_score ?? 0,
    manualTieBreakRank: t.manual_tie_break_rank ?? null,
  }));
  const standings = computeAllGroupStandings(teamRefs, results);
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const advancingThirdGroups = computeAdvancingThirdGroups(standings);
  const rankedThirds = rankAllThirdPlaceTeams(standings);
  const thirdRankByGroup = new Map(
    rankedThirds.map((entry) => [entry.group, entry.rankAmongThirds])
  );
  const qualifiedTeams = standings.flatMap((standing) =>
    standing.positions
      .filter((row) => row.rank <= 2 || (row.rank === 3 && advancingThirdGroups.includes(standing.group)))
      .map((row) => ({
        group: standing.group,
        code: `${row.rank}${standing.group}`,
        qualification:
          row.rank <= 2
            ? "Directo"
            : `Mejor 3.º #${thirdRankByGroup.get(standing.group) ?? "?"}`,
        teamId: row.teamId,
        fifaCode: row.fifaCode,
        name: teamById.get(row.teamId)?.name_es ?? row.fifaCode,
        played: row.played,
        pts: row.pts,
        gd: row.gd,
        gf: row.gf,
      }))
  );
  const thirdPlaceTeams = rankedThirds.map((entry) => ({
    group: entry.group,
    code: `3${entry.group}`,
    rankAmongThirds: entry.rankAmongThirds,
    advances: entry.advances,
    teamId: entry.row.teamId,
    fifaCode: entry.row.fifaCode,
    name: teamById.get(entry.row.teamId)?.name_es ?? entry.row.fifaCode,
    played: entry.row.played,
    pts: entry.row.pts,
    gd: entry.row.gd,
    gf: entry.row.gf,
    manualTieBreakRank: entry.row.manualTieBreakRank,
  }));

  return {
    groups: standings.map((s) => ({
      group: s.group,
      rows: s.positions.map((r) => ({
        rank: r.rank,
        fifaCode: r.fifaCode,
        name: teamById.get(r.teamId)?.name_es ?? r.fifaCode,
        played: r.played,
        pts: r.pts,
        gd: r.gd,
        gf: r.gf,
      })),
    })),
    advancingThirdGroups: new Set(advancingThirdGroups),
    qualifiedTeams,
    thirdPlaceTeams,
  };
}
