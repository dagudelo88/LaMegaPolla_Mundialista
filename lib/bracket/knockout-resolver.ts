import {
  areAllGroupsComplete,
  isGroupStageCompleteForGroup,
} from "./group-completion";
import { computeAllGroupStandings, getTeamAtRank } from "./group-standings";
import { pickBestThirdForSlot } from "./third-place-advancement";
import type {
  BracketSlot,
  GroupMatchResult,
  KnockoutMatchDef,
  KnockoutPredictionScores,
  MatchWinnerContext,
  ResolvedMatchTeams,
  TeamRef,
} from "./types";

export interface KnockoutResolveOptions {
  /** Only resolve group/third slots after official group-stage results are complete. */
  requireOfficialGroupCompletion?: boolean;
}

function resolveSlot(
  slot: BracketSlot,
  standings: ReturnType<typeof computeAllGroupStandings>,
  advancingThirdGroups: string[],
  winners: Map<number, number>,
  losers: Map<number, number>,
  usedThirdTeamIds: Set<number>,
  teams: TeamRef[],
  groupResults: GroupMatchResult[],
  options?: KnockoutResolveOptions
): number | null {
  switch (slot.type) {
    case "group_rank": {
      if (
        options?.requireOfficialGroupCompletion &&
        !isGroupStageCompleteForGroup(slot.group, teams, groupResults)
      ) {
        return null;
      }
      const groupStanding = standings.find((s) => s.group === slot.group);
      if (!groupStanding) return null;
      return getTeamAtRank(groupStanding, slot.rank)?.teamId ?? null;
    }
    case "third_best": {
      if (
        options?.requireOfficialGroupCompletion &&
        !areAllGroupsComplete(teams, groupResults)
      ) {
        return null;
      }
      const pick = pickBestThirdForSlot(
        standings,
        advancingThirdGroups,
        slot.eligible_groups,
        usedThirdTeamIds
      );
      if (pick) usedThirdTeamIds.add(pick.teamId);
      return pick?.teamId ?? null;
    }
    case "match_winner":
      return winners.get(slot.match_number) ?? null;
    case "match_loser":
      return losers.get(slot.match_number) ?? null;
    default:
      return null;
  }
}

function predictedWinner(ctx: MatchWinnerContext): number {
  const { predictedHome, predictedAway, homeTeamId, awayTeamId, predictedAdvancesTeamId } = ctx;
  if (predictedHome > predictedAway) return homeTeamId;
  if (predictedAway > predictedHome) return awayTeamId;
  if (predictedAdvancesTeamId != null) return predictedAdvancesTeamId;
  return homeTeamId;
}

function predictedLoser(ctx: MatchWinnerContext): number {
  const winner = predictedWinner(ctx);
  return winner === ctx.homeTeamId ? ctx.awayTeamId : ctx.homeTeamId;
}

export function buildKnockoutWinnerMaps(
  knockoutDefs: KnockoutMatchDef[],
  resolvedTeams: Map<number, ResolvedMatchTeams>,
  predictions: Map<number, MatchWinnerContext>
): { winners: Map<number, number>; losers: Map<number, number> } {
  const winners = new Map<number, number>();
  const losers = new Map<number, number>();

  const sorted = [...knockoutDefs].sort((a, b) => a.fifaMatchNumber - b.fifaMatchNumber);

  for (const def of sorted) {
    const teams = resolvedTeams.get(def.fifaMatchNumber);
    const pred = predictions.get(def.fifaMatchNumber);
    if (!teams?.homeTeamId || !teams?.awayTeamId || !pred) continue;

    const ctx: MatchWinnerContext = {
      matchNumber: def.fifaMatchNumber,
      homeTeamId: teams.homeTeamId,
      awayTeamId: teams.awayTeamId,
      predictedHome: pred.predictedHome,
      predictedAway: pred.predictedAway,
      predictedAdvancesTeamId: pred.predictedAdvancesTeamId,
    };

    winners.set(def.fifaMatchNumber, predictedWinner(ctx));
    losers.set(def.fifaMatchNumber, predictedLoser(ctx));
  }

  return { winners, losers };
}

export function resolveKnockoutMatch(
  def: KnockoutMatchDef,
  teams: TeamRef[],
  groupResults: GroupMatchResult[],
  advancingThirdGroups: string[],
  winners: Map<number, number>,
  losers: Map<number, number>,
  options?: KnockoutResolveOptions
): ResolvedMatchTeams {
  const standings = computeAllGroupStandings(teams, groupResults);
  const usedThirdTeamIds = new Set<number>();
  const homeTeamId = resolveSlot(
    def.homeSource,
    standings,
    advancingThirdGroups,
    winners,
    losers,
    usedThirdTeamIds,
    teams,
    groupResults,
    options
  );
  const awayTeamId = resolveSlot(
    def.awaySource,
    standings,
    advancingThirdGroups,
    winners,
    losers,
    usedThirdTeamIds,
    teams,
    groupResults,
    options
  );

  return {
    homeTeamId,
    awayTeamId,
    unresolved: homeTeamId == null || awayTeamId == null,
  };
}

export const THIRD_PLACE_MATCH_NUMBER = 103;
export const FINAL_MATCH_NUMBER = 104;

export interface TournamentPodium {
  championId: number | null;
  runnerUpId: number | null;
  thirdPlaceId: number | null;
}

export function resolveTournamentPodium(
  knockoutDefs: KnockoutMatchDef[],
  teams: TeamRef[],
  groupResults: GroupMatchResult[],
  advancingThirdGroups: string[],
  knockoutPredictions: Map<number, KnockoutPredictionScores>
): TournamentPodium {
  const resolved = resolveAllKnockoutMatches(
    knockoutDefs,
    teams,
    groupResults,
    advancingThirdGroups,
    knockoutPredictions
  );

  const winnerContexts = new Map<number, MatchWinnerContext>();
  for (const def of knockoutDefs) {
    const teamsForMatch = resolved.get(def.fifaMatchNumber);
    const pred = knockoutPredictions.get(def.fifaMatchNumber);
    if (
      !teamsForMatch?.homeTeamId ||
      !teamsForMatch?.awayTeamId ||
      !pred ||
      pred.predictedHome == null ||
      pred.predictedAway == null
    ) {
      continue;
    }
    winnerContexts.set(def.fifaMatchNumber, {
      matchNumber: def.fifaMatchNumber,
      homeTeamId: teamsForMatch.homeTeamId,
      awayTeamId: teamsForMatch.awayTeamId,
      predictedHome: pred.predictedHome,
      predictedAway: pred.predictedAway,
      predictedAdvancesTeamId: pred.predictedAdvancesTeamId,
    });
  }

  const { winners, losers } = buildKnockoutWinnerMaps(knockoutDefs, resolved, winnerContexts);

  return {
    championId: winners.get(FINAL_MATCH_NUMBER) ?? null,
    runnerUpId: losers.get(FINAL_MATCH_NUMBER) ?? null,
    thirdPlaceId: winners.get(THIRD_PLACE_MATCH_NUMBER) ?? null,
  };
}

export function resolveAllKnockoutMatches(
  knockoutDefs: KnockoutMatchDef[],
  teams: TeamRef[],
  groupResults: GroupMatchResult[],
  advancingThirdGroups: string[],
  knockoutPredictions: Map<number, KnockoutPredictionScores>
): Map<number, ResolvedMatchTeams> {
  const resolved = new Map<number, ResolvedMatchTeams>();
  const sorted = [...knockoutDefs].sort((a, b) => a.fifaMatchNumber - b.fifaMatchNumber);

  const winners = new Map<number, number>();
  const losers = new Map<number, number>();

  for (const def of sorted) {
    const teamsForMatch = resolveKnockoutMatch(
      def,
      teams,
      groupResults,
      advancingThirdGroups,
      winners,
      losers
    );
    resolved.set(def.fifaMatchNumber, teamsForMatch);

    const pred = knockoutPredictions.get(def.fifaMatchNumber);
    if (
      pred &&
      teamsForMatch.homeTeamId != null &&
      teamsForMatch.awayTeamId != null &&
      pred.predictedHome != null &&
      pred.predictedAway != null
    ) {
      const ctx: MatchWinnerContext = {
        matchNumber: def.fifaMatchNumber,
        homeTeamId: teamsForMatch.homeTeamId,
        awayTeamId: teamsForMatch.awayTeamId,
        predictedHome: pred.predictedHome,
        predictedAway: pred.predictedAway,
        predictedAdvancesTeamId: pred.predictedAdvancesTeamId,
      };
      winners.set(def.fifaMatchNumber, predictedWinner(ctx));
      losers.set(def.fifaMatchNumber, predictedLoser(ctx));
    }
  }

  return resolved;
}
