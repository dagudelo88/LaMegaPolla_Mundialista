import type { GroupStanding, StandingRow } from "./types";
import {
  THIRD_PLACE_SCENARIOS,
  THIRD_PLACE_SCENARIO_SLOT_MATCH_NUMBERS,
} from "./third-place-scenarios";

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

  const aManual = a.manualTieBreakRank ?? Number.POSITIVE_INFINITY;
  const bManual = b.manualTieBreakRank ?? Number.POSITIVE_INFINITY;
  if (aManual !== bManual) return aManual - bManual;

  if (b.teamConductScore !== a.teamConductScore) {
    return b.teamConductScore - a.teamConductScore;
  }

  const aRanking = a.fifaRanking ?? Number.POSITIVE_INFINITY;
  const bRanking = b.fifaRanking ?? Number.POSITIVE_INFINITY;
  if (aRanking !== bRanking) return aRanking - bRanking;

  return a.fifaCode.localeCompare(b.fifaCode);
}

/** Rank all 12 third-place teams; top 8 advance using FIFA 2026 criteria. */
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

/** Rank third-place teams among advancing groups using FIFA 2026 criteria. */
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

function scenarioKey(groups: string[]): string {
  return [...new Set(groups)].sort().join("");
}

export function resolveThirdPlaceScenarioGroups(
  advancingThirdGroups: string[]
): Map<number, string> {
  if (advancingThirdGroups.length !== REQUIRED_THIRD_PLACE_COUNT) return new Map();

  const slots = THIRD_PLACE_SCENARIOS[scenarioKey(advancingThirdGroups)];
  if (!slots) return new Map();

  return new Map(
    THIRD_PLACE_SCENARIO_SLOT_MATCH_NUMBERS.map((matchNumber, index) => [
      matchNumber,
      slots[index]!,
    ])
  );
}

export function resolveThirdPlaceScenarioTeams(
  standings: GroupStanding[],
  advancingThirdGroups: string[]
): Map<number, number> {
  const scenarioGroups = resolveThirdPlaceScenarioGroups(advancingThirdGroups);
  const thirdByGroup = new Map<string, StandingRow>();

  for (const standing of standings) {
    const third = standing.positions.find((position) => position.rank === 3);
    if (third) thirdByGroup.set(standing.group, third);
  }

  const assignments = new Map<number, number>();
  for (const [matchNumber, group] of scenarioGroups) {
    const third = thirdByGroup.get(group);
    if (third) assignments.set(matchNumber, third.teamId);
  }

  return assignments;
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
