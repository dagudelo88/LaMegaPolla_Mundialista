import type { GroupStanding, StandingRow } from "./types";

export const REQUIRED_THIRD_PLACE_COUNT = 8;

export interface RankedThirdPlace {
  group: string;
  row: StandingRow;
  rankAmongThirds: number;
  advances: boolean;
}

function compareThirdPlaceRows(a: StandingRow, b: StandingRow): number {
  if (b.pts !== a.pts) return b.pts - a.pts;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return a.fifaCode.localeCompare(b.fifaCode);
}

/** Rank all 12 third-place teams; top 8 advance (FIFA: pts → GD → GF). */
export function rankAllThirdPlaceTeams(standings: GroupStanding[]): RankedThirdPlace[] {
  const thirds: { group: string; row: StandingRow }[] = [];

  for (const standing of standings) {
    const third = standing.positions.find((p) => p.rank === 3);
    if (third) thirds.push({ group: standing.group, row: third });
  }

  thirds.sort((a, b) => compareThirdPlaceRows(a.row, b.row));

  return thirds.map((entry, index) => ({
    group: entry.group,
    row: entry.row,
    rankAmongThirds: index + 1,
    advances: index < REQUIRED_THIRD_PLACE_COUNT,
  }));
}

/** Derive the 8 groups whose third-place team advances from simulated standings. */
export function computeAdvancingThirdGroups(standings: GroupStanding[]): string[] {
  return rankAllThirdPlaceTeams(standings)
    .filter((entry) => entry.advances)
    .map((entry) => entry.group);
}

export function validateThirdPlaceSelection(selectedGroups: string[]): {
  valid: boolean;
  error?: string;
} {
  if (selectedGroups.length !== REQUIRED_THIRD_PLACE_COUNT) {
    return {
      valid: false,
      error: `third_place_count:${selectedGroups.length}`,
    };
  }
  const unique = new Set(selectedGroups);
  if (unique.size !== REQUIRED_THIRD_PLACE_COUNT) {
    return { valid: false, error: "third_place_duplicate" };
  }
  return { valid: true };
}

/** Rank third-place teams among advancing groups (FIFA: pts → GD → GF). */
export function rankThirdPlaceTeams(
  standings: GroupStanding[],
  advancingThirdGroups: string[]
): StandingRow[] {
  const advanceSet = new Set(advancingThirdGroups);
  const thirds: StandingRow[] = [];

  for (const s of standings) {
    if (!advanceSet.has(s.group)) continue;
    const third = s.positions.find((p) => p.rank === 3);
    if (third) thirds.push({ ...third, fifaCode: `${third.fifaCode} (${s.group})` });
  }

  return thirds.sort((a, b) => compareThirdPlaceRows(a, b));
}

export function pickBestThirdForSlot(
  standings: GroupStanding[],
  advancingThirdGroups: string[],
  eligibleGroups: string[],
  usedTeamIds: Set<number> = new Set()
): StandingRow | null {
  const eligible = new Set(eligibleGroups);
  const ranked = rankThirdPlaceTeams(standings, advancingThirdGroups);
  return (
    ranked.find((t) => {
      if (usedTeamIds.has(t.teamId)) return false;
      const group = advancingThirdGroups.find((g) => {
        const standing = standings.find((s) => s.group === g);
        return standing?.positions.some((p) => p.rank === 3 && p.teamId === t.teamId);
      });
      return group && eligible.has(group);
    }) ?? null
  );
}
