import { formatMatchDateSortKey } from "@/lib/matches/format-datetime";

/** Calendar date (YYYY-MM-DD) in app timezone (America/Bogota). */
export function getTournamentTodayKey(now: Date = new Date()): string {
  return formatMatchDateSortKey(now.toISOString());
}

/** Map an ISO timestamp to app calendar date for change_date storage. */
export function getTournamentDateKeyFromIso(iso: string): string {
  return formatMatchDateSortKey(iso);
}

/** UTC bounds [start, end) for the current app calendar day (Colombia, UTC-5). */
export function getAppDayUtcBounds(now: Date = new Date()): { start: string; end: string } {
  const dayKey = getTournamentTodayKey(now);
  const start = new Date(`${dayKey}T00:00:00-05:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}
