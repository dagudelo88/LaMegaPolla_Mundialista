import type { GroupMatchResult, GroupStanding, StandingRow, TeamRef } from "./types";

/** FIFA tie-break: points → GD → GF → alphabetical by code (simplified). */
function compareStanding(a: StandingRow, b: StandingRow): number {
  if (b.pts !== a.pts) return b.pts - a.pts;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return a.fifaCode.localeCompare(b.fifaCode);
}

function initRow(team: TeamRef): StandingRow {
  return {
    rank: 0,
    teamId: team.id,
    fifaCode: team.fifaCode,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    gc: 0,
    gd: 0,
    pts: 0,
  };
}

function applyResult(rows: Map<number, StandingRow>, result: GroupMatchResult) {
  const home = rows.get(result.homeTeamId);
  const away = rows.get(result.awayTeamId);
  if (!home || !away) return;

  home.played += 1;
  away.played += 1;
  home.gf += result.homeGoals;
  home.gc += result.awayGoals;
  away.gf += result.awayGoals;
  away.gc += result.homeGoals;
  home.gd = home.gf - home.gc;
  away.gd = away.gf - away.gc;

  if (result.homeGoals > result.awayGoals) {
    home.won += 1;
    home.pts += 3;
    away.lost += 1;
  } else if (result.homeGoals < result.awayGoals) {
    away.won += 1;
    away.pts += 3;
    home.lost += 1;
  } else {
    home.drawn += 1;
    away.drawn += 1;
    home.pts += 1;
    away.pts += 1;
  }
}

export function computeGroupStanding(
  group: string,
  teams: TeamRef[],
  results: GroupMatchResult[]
): GroupStanding {
  const groupTeams = teams.filter((t) => t.groupLetter === group);
  const rows = new Map(groupTeams.map((t) => [t.id, initRow(t)]));

  for (const r of results) {
    applyResult(rows, r);
  }

  const sorted = [...rows.values()].sort(compareStanding);
  sorted.forEach((row, i) => {
    row.rank = i + 1;
  });

  return { group, positions: sorted };
}

export function computeAllGroupStandings(
  teams: TeamRef[],
  results: GroupMatchResult[]
): GroupStanding[] {
  const groups = [...new Set(teams.map((t) => t.groupLetter))].sort();
  return groups.map((g) => {
    const teamIds = new Set(teams.filter((t) => t.groupLetter === g).map((t) => t.id));
    const groupResults = results.filter(
      (r) => teamIds.has(r.homeTeamId) && teamIds.has(r.awayTeamId)
    );
    return computeGroupStanding(g, teams, groupResults);
  });
}

export function getTeamAtRank(standing: GroupStanding, rank: number): StandingRow | undefined {
  return standing.positions.find((p) => p.rank === rank);
}
