import type { GroupMatchResult, GroupStanding, TeamRef } from "./types";

/** Four-team groups play six matches in the World Cup format. */
export const MATCHES_PER_GROUP = 6;

export function countGroupMatchResults(
  group: string,
  teams: TeamRef[],
  results: GroupMatchResult[]
): number {
  const groupTeamIds = new Set(
    teams.filter((t) => t.groupLetter === group).map((t) => t.id)
  );
  return results.filter(
    (r) => groupTeamIds.has(r.homeTeamId) && groupTeamIds.has(r.awayTeamId)
  ).length;
}

export function isGroupStageCompleteForGroup(
  group: string,
  teams: TeamRef[],
  results: GroupMatchResult[]
): boolean {
  return countGroupMatchResults(group, teams, results) >= MATCHES_PER_GROUP;
}

export function areAllGroupsComplete(
  teams: TeamRef[],
  results: GroupMatchResult[]
): boolean {
  const groups = [...new Set(teams.map((t) => t.groupLetter))];
  return groups.every((g) => isGroupStageCompleteForGroup(g, teams, results));
}

export function groupStandingHasResults(standing: GroupStanding): boolean {
  return standing.positions.some((p) => p.played > 0);
}
