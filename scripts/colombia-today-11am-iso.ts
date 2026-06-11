/** Today at 11:00 America/Bogota as UTC ISO (Colombia is UTC-5, no DST). */
export function colombiaTodayAt11Iso(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)!.value;

  return `${get("year")}-${get("month")}-${get("day")}T16:00:00.000Z`;
}
