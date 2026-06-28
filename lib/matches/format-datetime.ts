/** App-wide display and business-date timezone for Colombian participants. */
export const APP_TIMEZONE = "America/Bogota";
export const APP_LOCALE = "es-CO";

/** YYYY-MM-DD in app timezone — safe for chronological sort and daily limits. */
export function formatMatchDateSortKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function formatMatchDateKey(iso: string): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function formatMatchDateHeader(iso: string): string {
  const formatted = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Header for FIFA official schedule day (YYYY-MM-DD, venue-local calendar). */
export function formatFifaScheduleDateHeader(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const formatted = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(noonUtc);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function getFifaScheduleDateKey(match: { fifa_schedule_date: string }): string {
  return match.fifa_schedule_date;
}

export function formatMatchTime(iso: string): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function isParseableInstant(value: string | Date): boolean {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime());
}

/** Full date + time in Colombia for UI timestamps (history, deadlines, kickoffs). */
export function formatAppDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** Same instant in the viewer's local timezone (browser / server runtime). */
export function formatViewerLocalDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(APP_LOCALE, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDeadlineWithLocalHint(value: string | Date): string {
  const colombia = formatAppDateTime(value);
  const local = formatViewerLocalDateTime(value);
  if (local === colombia) return colombia;
  return `${colombia} (tu hora local: ${local})`;
}
