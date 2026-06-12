import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import type { BracketContext } from "@/lib/scoring/bracket-context";

export interface BracketGateResult {
  scorable: boolean;
  reason?: string;
  blockedTeams?: number[];
}

/**
 * REGLAS §7: knockout matches only score if both teams in the user's bracket
 * are still alive officially for that phase.
 */
export function isKnockoutMatchScorableForUser(
  ctx: BracketContext,
  phase: MatchPhase,
  userHomeTeamId: number | null,
  userAwayTeamId: number | null
): BracketGateResult {
  if (phase === "group_stage") return { scorable: true };

  const officialTeams = ctx.officialTeamsByPhase.get(phase) ?? new Set<number>();
  const blocked: number[] = [];

  if (userHomeTeamId != null && !officialTeams.has(userHomeTeamId)) {
    blocked.push(userHomeTeamId);
  }
  if (userAwayTeamId != null && !officialTeams.has(userAwayTeamId)) {
    blocked.push(userAwayTeamId);
  }

  if (blocked.length > 0) {
    return {
      scorable: false,
      reason: "bracket_gate",
      blockedTeams: blocked,
    };
  }

  return { scorable: true };
}

export function isKnockoutMatchScorableForUserByMatchNumber(
  ctx: BracketContext,
  userResolved: Map<number, { homeTeamId: number | null; awayTeamId: number | null }>,
  matchId: string
): BracketGateResult {
  const match = ctx.matchById.get(matchId);
  if (!match || match.fifa_match_number == null) return { scorable: true };

  const phase = match.phase as MatchPhase;
  if (phase === "group_stage") return { scorable: true };

  const userTeams = userResolved.get(match.fifa_match_number);
  if (!userTeams) return { scorable: true };

  return isKnockoutMatchScorableForUser(
    ctx,
    phase,
    userTeams.homeTeamId,
    userTeams.awayTeamId
  );
}
