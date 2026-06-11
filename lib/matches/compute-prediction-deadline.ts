export const DEFAULT_DEADLINE_OFFSET_MINUTES = 60;

export function parseDeadlineOffsetMinutes(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : Number(typeof value === "string" ? value : DEFAULT_DEADLINE_OFFSET_MINUTES);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_DEADLINE_OFFSET_MINUTES;
  return Math.round(n);
}

export function computePredictionDeadline(
  kickoffAt: Date,
  offsetMinutes: number = DEFAULT_DEADLINE_OFFSET_MINUTES
): Date {
  const offset = parseDeadlineOffsetMinutes(offsetMinutes);
  return new Date(kickoffAt.getTime() - offset * 60_000);
}
