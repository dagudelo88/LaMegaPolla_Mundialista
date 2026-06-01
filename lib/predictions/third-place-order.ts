import { computeAllGroupStandings } from "@/lib/bracket/group-standings";
import {
  rankAllThirdPlaceTeams,
  type RankedThirdPlace,
} from "@/lib/bracket/third-place-advancement";
import type { GroupMatchResult } from "@/lib/bracket/types";

export interface ThirdPlaceTeamInput {
  id: number;
  fifa_code: string;
  group_letter: string;
  fifa_ranking?: number | null;
  team_conduct_score?: number | null;
  manual_tie_break_rank?: number | null;
}

function toTeamRefs(teams: ThirdPlaceTeamInput[], ignoreManualTieBreak: boolean) {
  return teams.map((t) => ({
    id: t.id,
    fifaCode: t.fifa_code,
    groupLetter: t.group_letter,
    fifaRanking: t.fifa_ranking ?? null,
    teamConductScore: t.team_conduct_score ?? 0,
    manualTieBreakRank: ignoreManualTieBreak ? null : (t.manual_tie_break_rank ?? null),
  }));
}

export function rankThirdPlaceFromGroupResults(
  teams: ThirdPlaceTeamInput[],
  groupResults: GroupMatchResult[],
  options?: { ignoreManualTieBreak?: boolean }
): RankedThirdPlace[] {
  const standings = computeAllGroupStandings(
    toTeamRefs(teams, options?.ignoreManualTieBreak ?? false),
    groupResults
  );
  return rankAllThirdPlaceTeams(standings);
}

/** True when official third-place order differs from the user's pre-official prediction. */
export function thirdPlaceOrderDiffers(
  official: RankedThirdPlace[],
  predictedWithoutManualTieBreak: RankedThirdPlace[]
): boolean {
  if (official.length !== predictedWithoutManualTieBreak.length) return true;

  const officialAdvancing = official
    .filter((entry) => entry.advances)
    .map((entry) => entry.group)
    .sort()
    .join(",");
  const predictedAdvancing = predictedWithoutManualTieBreak
    .filter((entry) => entry.advances)
    .map((entry) => entry.group)
    .sort()
    .join(",");
  if (officialAdvancing !== predictedAdvancing) return true;

  for (const entry of official) {
    const predicted = predictedWithoutManualTieBreak.find((p) => p.group === entry.group);
    if (!predicted || predicted.rankAmongThirds !== entry.rankAmongThirds) {
      return true;
    }
  }

  return false;
}

export function advancingThirdGroupsFromRanked(ranked: RankedThirdPlace[]): string[] {
  return ranked.filter((entry) => entry.advances).map((entry) => entry.group);
}
