import type { BracketContext } from "@/lib/scoring/bracket-context";

/** Official home/away for a match: DB row first, then resolved knockout bracket. */
export function resolveOfficialMatchTeamIds(
  ctx: BracketContext,
  matchId: string,
  overrides?: { homeTeamId?: number | null; awayTeamId?: number | null }
): { homeTeamId: number | null; awayTeamId: number | null } {
  const matchRow = ctx.matchById.get(matchId);
  const homeFromDb = overrides?.homeTeamId ?? matchRow?.home_team_id ?? null;
  const awayFromDb = overrides?.awayTeamId ?? matchRow?.away_team_id ?? null;

  if (homeFromDb != null && awayFromDb != null) {
    return { homeTeamId: homeFromDb, awayTeamId: awayFromDb };
  }

  const fifaNumber = matchRow?.fifa_match_number;
  if (fifaNumber == null) {
    return { homeTeamId: homeFromDb, awayTeamId: awayFromDb };
  }

  const resolved = ctx.officialKnockoutResolved.get(fifaNumber);
  return {
    homeTeamId: homeFromDb ?? resolved?.homeTeamId ?? null,
    awayTeamId: awayFromDb ?? resolved?.awayTeamId ?? null,
  };
}
