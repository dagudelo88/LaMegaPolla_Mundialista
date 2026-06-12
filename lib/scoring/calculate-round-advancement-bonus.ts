import type { MatchPhase } from "@/lib/scoring/calculate-match-points";

export interface RoundAdvancementResult {
  points: number;
  correctTeamIds: number[];
  incorrectTeamIds: number[];
  userTeamIds: number[];
  officialTeamIds: number[];
}

export function calculateRoundAdvancementBonus(
  userTeamIds: number[],
  officialTeamIds: number[],
  bonusPerTeam: number
): RoundAdvancementResult {
  const officialSet = new Set(officialTeamIds);
  const correctTeamIds = userTeamIds.filter((id) => officialSet.has(id));
  const incorrectTeamIds = userTeamIds.filter((id) => !officialSet.has(id));

  return {
    points: correctTeamIds.length * bonusPerTeam,
    correctTeamIds,
    incorrectTeamIds,
    userTeamIds,
    officialTeamIds,
  };
}

export function teamsForRoundComparison(
  roundKey: string,
  nextPhase: MatchPhase | null,
  userTeamsByPhase: Map<MatchPhase, Set<number>>,
  officialTeamsByPhase: Map<MatchPhase, Set<number>>
): { userTeamIds: number[]; officialTeamIds: number[] } {
  if (roundKey === "group_stage") {
    const user = userTeamsByPhase.get("round_of_32") ?? new Set<number>();
    const official = officialTeamsByPhase.get("round_of_32") ?? new Set<number>();
    return {
      userTeamIds: [...user],
      officialTeamIds: [...official],
    };
  }

  if (roundKey === "semi_final") {
    const userFinal = userTeamsByPhase.get("final") ?? new Set<number>();
    const userThird = userTeamsByPhase.get("third_place") ?? new Set<number>();
    const officialFinal = officialTeamsByPhase.get("final") ?? new Set<number>();
    const officialThird = officialTeamsByPhase.get("third_place") ?? new Set<number>();
    return {
      userTeamIds: [...new Set([...userFinal, ...userThird])],
      officialTeamIds: [...new Set([...officialFinal, ...officialThird])],
    };
  }

  if (!nextPhase) {
    return { userTeamIds: [], officialTeamIds: [] };
  }

  const user = userTeamsByPhase.get(nextPhase) ?? new Set<number>();
  const official = officialTeamsByPhase.get(nextPhase) ?? new Set<number>();
  return {
    userTeamIds: [...user],
    officialTeamIds: [...official],
  };
}
