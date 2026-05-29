import type { BracketSlot, KnockoutMatchDef } from "./types";

export interface OfficialFinishedMatch {
  fifaMatchNumber: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  resultAdvancesTeamId: number | null;
}

export function officialMatchWinner(match: OfficialFinishedMatch): number | null {
  if (match.homeScore > match.awayScore) return match.homeTeamId;
  if (match.awayScore > match.homeScore) return match.awayTeamId;
  return match.resultAdvancesTeamId;
}

export function officialMatchLoser(match: OfficialFinishedMatch): number | null {
  const winner = officialMatchWinner(match);
  if (winner == null) return null;
  return winner === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
}

export function buildOfficialKnockoutWinnerMaps(
  finishedKnockout: OfficialFinishedMatch[]
): { winners: Map<number, number>; losers: Map<number, number> } {
  const winners = new Map<number, number>();
  const losers = new Map<number, number>();

  for (const match of finishedKnockout) {
    const winner = officialMatchWinner(match);
    const loser = officialMatchLoser(match);
    if (winner != null) winners.set(match.fifaMatchNumber, winner);
    if (loser != null) losers.set(match.fifaMatchNumber, loser);
  }

  return { winners, losers };
}

export function parseKnockoutDefs(
  matches: Array<{
    fifa_match_number: number | null;
    phase: string;
    home_source: unknown;
    away_source: unknown;
  }>
): KnockoutMatchDef[] {
  return matches
    .filter((m) => m.phase !== "group_stage" && m.fifa_match_number != null)
    .map((m) => ({
      fifaMatchNumber: m.fifa_match_number!,
      phase: m.phase,
      homeSource: m.home_source as BracketSlot,
      awaySource: m.away_source as BracketSlot,
    }));
}
