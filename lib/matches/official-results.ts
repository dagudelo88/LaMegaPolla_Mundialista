import type { GroupMatchResult } from "@/lib/bracket/types";

export interface OfficialMatchRow {
  phase: string;
  status: string;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score?: number | null;
  away_score?: number | null;
}

export function buildOfficialGroupResults(matches: OfficialMatchRow[]): GroupMatchResult[] {
  const results: GroupMatchResult[] = [];

  for (const match of matches) {
    if (match.phase !== "group_stage") continue;
    if (match.status !== "finished" && match.status !== "live") continue;
    if (match.home_team_id == null || match.away_team_id == null) continue;
    if (match.home_score == null || match.away_score == null) continue;

    results.push({
      homeTeamId: match.home_team_id,
      awayTeamId: match.away_team_id,
      homeGoals: match.home_score,
      awayGoals: match.away_score,
    });
  }

  return results;
}

export function countOfficialResults(matches: OfficialMatchRow[]) {
  let finished = 0;
  let live = 0;
  let scheduled = 0;

  for (const match of matches) {
    if (match.status === "finished") finished += 1;
    else if (match.status === "live") live += 1;
    else scheduled += 1;
  }

  return { finished, live, scheduled, total: matches.length };
}
