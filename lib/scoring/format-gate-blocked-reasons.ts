import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import {
  getBlockedTeamGateDetails,
  type BlockedTeamGateDetail,
} from "@/lib/scoring/blocked-team-gate-status";
import type { BracketContext } from "@/lib/scoring/bracket-context";
import { es } from "@/lib/i18n/es";
import { PHASE_LABELS } from "@/types/database";

function phaseLabel(phase: MatchPhase): string {
  return PHASE_LABELS[phase] ?? phase;
}

export function formatGateBlockedReasonForTeam(
  detail: BlockedTeamGateDetail,
  teamName: string,
  targetPhase: MatchPhase
): string {
  const target = phaseLabel(targetPhase);
  if (detail.status === "eliminated_before" && detail.lastOfficialPhase) {
    return es.gateBlocked.eliminatedBefore(
      teamName,
      target,
      phaseLabel(detail.lastOfficialPhase)
    );
  }
  return es.gateBlocked.notInKnockout(teamName, target);
}

export function formatGateBlockedReasons(
  ctx: BracketContext,
  teamIds: number[],
  teamNameById: Map<number, string>,
  targetPhase: MatchPhase
): string[] {
  const details = getBlockedTeamGateDetails(ctx, teamIds, targetPhase);
  return details.map((detail) =>
    formatGateBlockedReasonForTeam(
      detail,
      teamNameById.get(detail.teamId) ?? String(detail.teamId),
      targetPhase
    )
  );
}

export function formatSlotMismatchReasons(
  officialHomeName: string | null,
  officialAwayName: string | null
): string[] {
  const reasons: string[] = [es.gateBlocked.slotMismatch];
  if (officialHomeName && officialAwayName) {
    reasons.push(es.gateBlocked.officialPairing(officialHomeName, officialAwayName));
  }
  return reasons;
}
