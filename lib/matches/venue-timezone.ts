/** IANA zones for WC 2026 host cities (handles DST for US/Canada in June–July 2026). */
export const VENUE_TIMEZONES = {
  mexico_city: "America/Mexico_City",
  guadalajara: "America/Mexico_City",
  monterrey: "America/Monterrey",
  toronto: "America/Toronto",
  vancouver: "America/Vancouver",
  los_angeles: "America/Los_Angeles",
  boston: "America/New_York",
  new_york: "America/New_York",
  santa_clara: "America/Los_Angeles",
  philadelphia: "America/New_York",
  houston: "America/Chicago",
  dallas: "America/Chicago",
  miami: "America/New_York",
  atlanta: "America/New_York",
  seattle: "America/Los_Angeles",
  kansas_city: "America/Chicago",
} as const;

export type VenueKey = keyof typeof VENUE_TIMEZONES;

export const VENUE_LABELS: Record<VenueKey, string> = {
  mexico_city: "Estadio Azteca, Ciudad de México",
  guadalajara: "Estadio Akron, Guadalajara",
  monterrey: "Estadio BBVA, Monterrey",
  toronto: "BMO Field, Toronto",
  vancouver: "BC Place, Vancouver",
  los_angeles: "SoFi Stadium, Los Ángeles",
  boston: "Gillette Stadium, Boston",
  new_york: "MetLife Stadium, Nueva York",
  santa_clara: "Levi's Stadium, Santa Clara",
  philadelphia: "Lincoln Financial Field, Filadelfia",
  houston: "NRG Stadium, Houston",
  dallas: "AT&T Stadium, Dallas",
  miami: "Hard Rock Stadium, Miami",
  atlanta: "Mercedes-Benz Stadium, Atlanta",
  seattle: "Lumen Field, Seattle",
  kansas_city: "Arrowhead Stadium, Kansas City",
};

function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return asUtc - instant.getTime();
}

/** Convert FIFA venue-local civil time to UTC ISO (timestamptz-safe). */
export function venueLocalToUtc(
  localDate: string,
  localTime: string,
  venueKey: VenueKey
): string {
  return civilLocalToUtc(localDate, localTime, VENUE_TIMEZONES[venueKey]);
}

/** Colombia civil time → UTC (FIFA fixtures with country=CO). */
export function bogotaLocalToUtc(localDate: string, localTime: string): string {
  return civilLocalToUtc(localDate, localTime, "America/Bogota");
}

export function utcToVenueLocal(
  iso: string,
  venueKey: VenueKey
): { localDate: string; localTime: string } {
  return utcToCivilLocal(iso, VENUE_TIMEZONES[venueKey]);
}

/** UTC ISO → Colombia civil date and time (for admin schedule forms). */
export function utcToBogotaLocal(iso: string): { localDate: string; localTime: string } {
  return utcToCivilLocal(iso, "America/Bogota");
}

function civilLocalToUtc(localDate: string, localTime: string, timeZone: string): string {
  const [year, month, day] = localDate.split("-").map(Number);
  const timeParts = localTime.split(":");
  const hour = Number(timeParts[0]);
  const minute = Number(timeParts[1] ?? 0);

  const localAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utcMs = localAsUtcMs;
  for (let i = 0; i < 2; i++) {
    const offsetMs = getTimeZoneOffsetMs(new Date(utcMs), timeZone);
    utcMs = localAsUtcMs - offsetMs;
  }

  return new Date(utcMs).toISOString().replace(/\.000Z$/, "Z");
}

function utcToCivilLocal(
  iso: string,
  timeZone: string
): { localDate: string; localTime: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return {
    localDate: `${get("year")}-${get("month")}-${get("day")}`,
    localTime: `${get("hour")}:${get("minute")}`,
  };
}

export function venueLabel(venueKey: VenueKey): string {
  return VENUE_LABELS[venueKey];
}
