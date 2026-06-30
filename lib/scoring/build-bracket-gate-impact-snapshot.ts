import type { ScoreAuditResult } from "@/lib/scoring/audit-scores";
import type { BracketGateCorrectionImpact } from "@/types/database";

export const BRACKET_GATE_CORRECTION_ACTION = "bracket_gate_scoring_correction";

export function buildBracketGateImpactSnapshot(
  audit: ScoreAuditResult
): BracketGateCorrectionImpact {
  return {
    impactedPlayers: audit.gatedSummaryByPlayer.map((player) => ({
      username: player.username,
      userId: player.userId,
      totalPointsRemoved: player.totalPointsOverAwarded,
      matches: player.matches,
    })),
  };
}
