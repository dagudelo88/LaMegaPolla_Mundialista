import type { GroupMatchResult, GroupStanding, StandingRow, TeamRef } from "./types";

interface HeadToHeadRow {
  row: StandingRow;
  pts: number;
  gd: number;
  gf: number;
}

function compareOverallTieBreak(a: StandingRow, b: StandingRow): number {
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  if (b.teamConductScore !== a.teamConductScore) {
    return b.teamConductScore - a.teamConductScore;
  }

  const aRanking = a.fifaRanking ?? Number.POSITIVE_INFINITY;
  const bRanking = b.fifaRanking ?? Number.POSITIVE_INFINITY;
  if (aRanking !== bRanking) return aRanking - bRanking;

  const aManual = a.manualTieBreakRank ?? Number.POSITIVE_INFINITY;
  const bManual = b.manualTieBreakRank ?? Number.POSITIVE_INFINITY;
  if (aManual !== bManual) return aManual - bManual;

  return a.fifaCode.localeCompare(b.fifaCode);
}

function groupByMetric(
  rows: HeadToHeadRow[],
  metric: keyof Pick<HeadToHeadRow, "pts" | "gd" | "gf">
): HeadToHeadRow[][] {
  const sorted = [...rows].sort((a, b) => b[metric] - a[metric]);
  const groups: HeadToHeadRow[][] = [];

  for (const row of sorted) {
    const last = groups.at(-1);
    if (last && last[0]![metric] === row[metric]) {
      last.push(row);
    } else {
      groups.push([row]);
    }
  }

  return groups;
}

function computeHeadToHeadRows(
  rows: StandingRow[],
  results: GroupMatchResult[]
): HeadToHeadRow[] {
  const tiedIds = new Set(rows.map((row) => row.teamId));
  const byId = new Map(
    rows.map((row) => [
      row.teamId,
      {
        row,
        pts: 0,
        gd: 0,
        gf: 0,
      },
    ])
  );

  for (const result of results) {
    if (!tiedIds.has(result.homeTeamId) || !tiedIds.has(result.awayTeamId)) continue;

    const home = byId.get(result.homeTeamId);
    const away = byId.get(result.awayTeamId);
    if (!home || !away) continue;

    home.gf += result.homeGoals;
    home.gd += result.homeGoals - result.awayGoals;
    away.gf += result.awayGoals;
    away.gd += result.awayGoals - result.homeGoals;

    if (result.homeGoals > result.awayGoals) {
      home.pts += 3;
    } else if (result.homeGoals < result.awayGoals) {
      away.pts += 3;
    } else {
      home.pts += 1;
      away.pts += 1;
    }
  }

  return [...byId.values()];
}

function rankHeadToHeadBuckets(
  rows: StandingRow[],
  results: GroupMatchResult[]
): StandingRow[][] {
  if (rows.length <= 1) return [rows];

  const headToHeadRows = computeHeadToHeadRows(rows, results);
  for (const metric of ["pts", "gd", "gf"] as const) {
    const groups = groupByMetric(headToHeadRows, metric);
    if (groups.length > 1) {
      return groups.flatMap((group) =>
        rankHeadToHeadBuckets(
          group.map((entry) => entry.row),
          results
        )
      );
    }
  }

  return [rows];
}

function rankByOfficialTieBreakers(
  rows: StandingRow[],
  groupResults: GroupMatchResult[]
): StandingRow[] {
  const pointsGroups = groupByMetric(
    rows.map((row) => ({ row, pts: row.pts, gd: row.gd, gf: row.gf })),
    "pts"
  );

  return pointsGroups.flatMap((pointsGroup) => {
    const tiedRows = pointsGroup.map((entry) => entry.row);
    const headToHeadBuckets = rankHeadToHeadBuckets(tiedRows, groupResults);
    return headToHeadBuckets.flatMap((bucket) => [...bucket].sort(compareOverallTieBreak));
  });
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
    teamConductScore: team.teamConductScore ?? 0,
    fifaRanking: team.fifaRanking ?? null,
    manualTieBreakRank: team.manualTieBreakRank ?? null,
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

  const sorted = rankByOfficialTieBreakers([...rows.values()], results);
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
