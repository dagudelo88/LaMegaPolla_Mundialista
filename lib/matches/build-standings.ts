import { computeAllGroupStandings } from "@/lib/bracket/group-standings";
import { buildOfficialGroupResults, type OfficialMatchRow } from "@/lib/matches/official-results";

export function buildOfficialStandings(
  teams: Array<{ id: number; fifa_code: string; name_es: string; group_letter: string }>,
  matches: OfficialMatchRow[]
) {
  const results = buildOfficialGroupResults(matches);
  const teamRefs = teams.map((t) => ({
    id: t.id,
    fifaCode: t.fifa_code,
    groupLetter: t.group_letter,
  }));
  const standings = computeAllGroupStandings(teamRefs, results);
  const teamById = new Map(teams.map((t) => [t.id, t]));

  return standings.map((s) => ({
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
  }));
}
