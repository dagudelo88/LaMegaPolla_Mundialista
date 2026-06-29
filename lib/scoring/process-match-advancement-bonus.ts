import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { matchAdvancementBonusKey } from "@/lib/scoring/advancement-bonus-keys";
import {
  calculateMatchAdvancementBonus,
  predictedAdvancingTeamId,
  officialAdvancingTeamId,
} from "@/lib/scoring/calculate-match-advancement-bonus";
import type { BracketContext } from "@/lib/scoring/bracket-context";
import {
  isKnockoutMatchScorableForUserByMatchNumber,
  isPartialAdvancementBonusEligible,
} from "@/lib/scoring/bracket-gate";
import { loadAdvancementBonusPerTeam } from "@/lib/scoring/load-advancement-bonus-config";
import { loadActiveSubmittedUserIds } from "@/lib/scoring/scoring-eligibility";

export interface ProcessMatchAdvancementInput {
  matchId: string;
  phase: MatchPhase;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  resultAdvancesTeamId: number | null;
}

export async function processMatchAdvancementBonus(
  admin: SupabaseClient,
  ctx: BracketContext,
  userResolvedByUserId: Map<string, Map<number, { homeTeamId: number | null; awayTeamId: number | null }>>,
  input: ProcessMatchAdvancementInput
): Promise<{ usersProcessed: number; userIds: string[] }> {
  if (input.phase === "group_stage") return { usersProcessed: 0, userIds: [] };

  const bonusPerTeam = await loadAdvancementBonusPerTeam(admin);
  const eligibleIds = await loadActiveSubmittedUserIds(admin);
  const matchRow = ctx.matchById.get(input.matchId);
  const fifaNumber = matchRow?.fifa_match_number;

  const { data: predictions } = await admin
    .from("predictions")
    .select("user_id, predicted_home, predicted_away, predicted_advances_team_id")
    .eq("match_id", input.matchId)
    .in("user_id", [...eligibleIds]);

  const userIds: string[] = [];

  for (const pred of predictions ?? []) {
    if (!eligibleIds.has(pred.user_id)) continue;

    const userResolved = userResolvedByUserId.get(pred.user_id);
    const gate = userResolved
      ? isKnockoutMatchScorableForUserByMatchNumber(ctx, userResolved, input.matchId)
      : { scorable: true };

    const userTeams =
      fifaNumber != null && userResolved ? userResolved.get(fifaNumber) : undefined;
    const officialPair =
      fifaNumber != null ? ctx.officialKnockoutResolved.get(fifaNumber) : undefined;

    const predictedAdvancer =
      userTeams?.homeTeamId != null && userTeams.awayTeamId != null
        ? predictedAdvancingTeamId({
            homeTeamId: userTeams.homeTeamId,
            awayTeamId: userTeams.awayTeamId,
            predictedHome: pred.predicted_home,
            predictedAway: pred.predicted_away,
            predictedAdvancesTeamId: pred.predicted_advances_team_id,
          })
        : predictedAdvancingTeamId({
            homeTeamId: input.homeTeamId,
            awayTeamId: input.awayTeamId,
            predictedHome: pred.predicted_home,
            predictedAway: pred.predicted_away,
            predictedAdvancesTeamId: pred.predicted_advances_team_id,
          });

    const officialAdvancer = officialAdvancingTeamId({
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      actualHome: input.homeScore,
      actualAway: input.awayScore,
      resultAdvancesTeamId: input.resultAdvancesTeamId,
    });

    const partialEligible =
      !gate.scorable &&
      userTeams != null &&
      officialPair != null &&
      isPartialAdvancementBonusEligible(
        userTeams,
        officialPair,
        predictedAdvancer,
        officialAdvancer
      );

    const points = gate.scorable
      ? calculateMatchAdvancementBonus(
          {
            phase: input.phase,
            homeTeamId: input.homeTeamId,
            awayTeamId: input.awayTeamId,
            predictedHome: pred.predicted_home,
            predictedAway: pred.predicted_away,
            predictedAdvancesTeamId: pred.predicted_advances_team_id,
            actualHome: input.homeScore,
            actualAway: input.awayScore,
            resultAdvancesTeamId: input.resultAdvancesTeamId,
          },
          bonusPerTeam
        )
      : partialEligible
        ? bonusPerTeam
        : 0;

    const { error } = await admin.from("user_advancement_bonus_points").upsert(
      {
        user_id: pred.user_id,
        bonus_key: matchAdvancementBonusKey(input.matchId),
        points,
        breakdown: {
          type: "match",
          matchId: input.matchId,
          phase: input.phase,
          predictedAdvancer,
          officialAdvancer,
          gated: !gate.scorable && !partialEligible,
          gateReason: gate.reason,
          partialAdvancement: partialEligible,
          blockedTeams: gate.blockedTeams,
        },
      },
      { onConflict: "user_id,bonus_key" }
    );

    if (error) throw new Error(error.message);
    userIds.push(pred.user_id);
  }

  return { usersProcessed: userIds.length, userIds };
}
