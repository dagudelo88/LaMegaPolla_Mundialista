import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import type { BracketContext } from "@/lib/scoring/bracket-context";
import { KNOCKOUT_PHASES, phaseOrderIndex } from "@/lib/scoring/knockout-phase-order";

export type BlockedTeamGateStatus = "not_in_knockout" | "eliminated_before";

export interface BlockedTeamGateDetail {
  teamId: number;
  status: BlockedTeamGateStatus;
  /** Furthest official knockout phase this team reached. */
  lastOfficialPhase?: MatchPhase;
}

/** Why a team blocks §7 scoring for a knockout phase. */
export function getBlockedTeamGateDetails(
  ctx: BracketContext,
  teamIds: number[],
  targetPhase: MatchPhase
): BlockedTeamGateDetail[] {
  const targetIdx = phaseOrderIndex(targetPhase);

  return teamIds.map((teamId) => {
    let lastOfficialPhase: MatchPhase | undefined;
    let highestIdx = -1;

    for (const phase of KNOCKOUT_PHASES) {
      if (!ctx.officialTeamsByPhase.get(phase)?.has(teamId)) continue;
      const idx = phaseOrderIndex(phase);
      if (idx > highestIdx) {
        highestIdx = idx;
        lastOfficialPhase = phase;
      }
    }

    if (lastOfficialPhase == null) {
      return { teamId, status: "not_in_knockout" };
    }
    if (highestIdx < targetIdx) {
      return { teamId, status: "eliminated_before", lastOfficialPhase };
    }
    return { teamId, status: "not_in_knockout" };
  });
}
