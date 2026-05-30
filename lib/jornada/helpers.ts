import { formatMatchDateSortKey } from "@/lib/matches/format-datetime";

export interface JornadaMatchRef {
  id: string;
  kickoff_at: string;
  status: string;
}

export function getJornadaKey(kickoffAt: string): string {
  return formatMatchDateSortKey(kickoffAt);
}

export function groupMatchesByJornada<T extends JornadaMatchRef>(
  matches: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const match of matches) {
    const key = getJornadaKey(match.kickoff_at);
    const list = map.get(key) ?? [];
    list.push(match);
    map.set(key, list);
  }
  return map;
}

export function isJornadaEligible(matches: unknown[]): boolean {
  return matches.length >= 2;
}

export function getJornadaFirstKickoff(matches: JornadaMatchRef[]): string {
  return matches.reduce(
    (earliest, m) => (m.kickoff_at < earliest ? m.kickoff_at : earliest),
    matches[0]!.kickoff_at
  );
}

export function isJornadaPickOpen(matches: JornadaMatchRef[], now: Date = new Date()): boolean {
  if (!matches.length) return false;
  const firstKickoff = getJornadaFirstKickoff(matches);
  return now.getTime() < new Date(firstKickoff).getTime();
}

export function isJornadaComplete(matches: JornadaMatchRef[]): boolean {
  return matches.length > 0 && matches.every((m) => m.status === "finished");
}

export interface FinishedMatchGoals {
  id: string;
  totalGoals: number;
}

export function resolveJornadaWinners(
  finishedMatches: FinishedMatchGoals[]
): { maxTotalGoals: number; winningMatchIds: string[]; isTie: boolean } {
  if (!finishedMatches.length) {
    return { maxTotalGoals: 0, winningMatchIds: [], isTie: true };
  }

  const maxTotalGoals = Math.max(...finishedMatches.map((m) => m.totalGoals));
  const winningMatchIds = finishedMatches
    .filter((m) => m.totalGoals === maxTotalGoals)
    .map((m) => m.id);

  return {
    maxTotalGoals,
    winningMatchIds,
    isTie: winningMatchIds.length !== 1,
  };
}
