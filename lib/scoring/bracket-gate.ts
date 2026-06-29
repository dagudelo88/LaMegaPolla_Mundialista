import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import type { BracketContext } from "@/lib/scoring/bracket-context";

export type BracketGateReason = "bracket_gate" | "slot_mismatch";

export interface BracketGateResult {
  scorable: boolean;
  reason?: BracketGateReason;
  blockedTeams?: number[];
}

export interface MatchTeamPair {
  homeTeamId: number | null;
  awayTeamId: number | null;
}

/** Same two teams in a slot (home/away order ignored). */
export function pairingMatchesSlot(
  userHome: number | null,
  userAway: number | null,
  officialHome: number | null,
  officialAway: number | null
): boolean {
  if (
    userHome == null ||
    userAway == null ||
    officialHome == null ||
    officialAway == null ||
    userHome === userAway ||
    officialHome === officialAway
  ) {
    return false;
  }
  const userSet = new Set([userHome, userAway]);
  const officialSet = new Set([officialHome, officialAway]);
  return (
    userSet.size === 2 &&
    officialSet.size === 2 &&
    userSet.size === officialSet.size &&
    [...userSet].every((id) => officialSet.has(id))
  );
}

export function overlappingTeamsInSlot(
  user: MatchTeamPair,
  official: MatchTeamPair
): number[] {
  const overlap: number[] = [];
  const officialIds = new Set(
    [official.homeTeamId, official.awayTeamId].filter((id): id is number => id != null)
  );
  for (const id of [user.homeTeamId, user.awayTeamId]) {
    if (id != null && officialIds.has(id) && !overlap.includes(id)) {
      overlap.push(id);
    }
  }
  return overlap;
}

/** +2 when slot differs but user nailed the advancer for a team present in both pairings. */
export function isPartialAdvancementBonusEligible(
  user: MatchTeamPair,
  official: MatchTeamPair,
  predictedAdvancerId: number | null,
  officialAdvancerId: number | null
): boolean {
  if (predictedAdvancerId == null || officialAdvancerId == null) return false;
  if (predictedAdvancerId !== officialAdvancerId) return false;
  return overlappingTeamsInSlot(user, official).includes(predictedAdvancerId);
}

/**
 * REGLAS §7: knockout match points only when both user teams are alive in the
 * official phase AND the user's pairing matches the official slot pairing.
 */
export function isKnockoutMatchScorableForUser(
  ctx: BracketContext,
  phase: MatchPhase,
  userHomeTeamId: number | null,
  userAwayTeamId: number | null,
  officialPair?: MatchTeamPair
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

  if (
    officialPair &&
    userHomeTeamId != null &&
    userAwayTeamId != null &&
    officialPair.homeTeamId != null &&
    officialPair.awayTeamId != null &&
    !pairingMatchesSlot(
      userHomeTeamId,
      userAwayTeamId,
      officialPair.homeTeamId,
      officialPair.awayTeamId
    )
  ) {
    return {
      scorable: false,
      reason: "slot_mismatch",
      blockedTeams: [],
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

  const officialPair = ctx.officialKnockoutResolved.get(match.fifa_match_number);

  return isKnockoutMatchScorableForUser(
    ctx,
    phase,
    userTeams.homeTeamId,
    userTeams.awayTeamId,
    officialPair
  );
}

export function isMatchAdvancementBonusEligible(
  ctx: BracketContext,
  userResolved: Map<number, { homeTeamId: number | null; awayTeamId: number | null }>,
  matchId: string,
  predictedAdvancerId: number | null,
  officialAdvancerId: number | null
): boolean {
  const gate = isKnockoutMatchScorableForUserByMatchNumber(ctx, userResolved, matchId);
  if (gate.scorable) return true;

  const match = ctx.matchById.get(matchId);
  if (!match?.fifa_match_number) return false;

  const userTeams = userResolved.get(match.fifa_match_number);
  const officialPair = ctx.officialKnockoutResolved.get(match.fifa_match_number);
  if (!userTeams || !officialPair) return false;

  return isPartialAdvancementBonusEligible(
    userTeams,
    officialPair,
    predictedAdvancerId,
    officialAdvancerId
  );
}
