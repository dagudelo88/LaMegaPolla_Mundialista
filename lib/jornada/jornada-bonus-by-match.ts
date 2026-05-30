/** Sum jornada bonus points per match from settled bonus rows. */
export function jornadaBonusByMatchId(
  rows: { points: number; breakdown: Record<string, unknown> | null }[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.points <= 0) continue;
    const pickedMatchId = row.breakdown?.pickedMatchId;
    if (typeof pickedMatchId !== "string") continue;
    map.set(pickedMatchId, (map.get(pickedMatchId) ?? 0) + row.points);
  }
  return map;
}
