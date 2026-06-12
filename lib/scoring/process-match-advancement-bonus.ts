import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { matchAdvancementBonusKey } from "@/lib/scoring/advancement-bonus-keys";
import {
  calculateMatchAdvancementBonus,
  predictedAdvancingTeamId,
  officialAdvancingTeamId,
} from "@/lib/scoring/calculate-match-advancement-bonus";
import type { BracketContext } from "@/lib/scoring/bracket-context";
import { isKnockoutMatchScorableForUserByMatchNumber } from "@/lib/scoring/bracket-gate";
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
): Promise<number> {
  if (input.phase === "group_stage") return 0;

  const bonusPerTeam = await loadAdvancementBonusPerTeam(admin);
  const eligibleIds = await loadActiveSubmittedUserIds(admin);

  const { data: predictions } = await admin
    .from("predictions")
    .select("user_id, predicted_home, predicted_away, predicted_advances_team_id")
    .eq("match_id", input.matchId)
    .in("user_id", [...eligibleIds]);

  let scored = 0;

  for (const pred of predictions ?? []) {
    if (!eligibleIds.has(pred.user_id)) continue;

    const userResolved = userResolvedByUserId.get(pred.user_id);
    const gate = userResolved
      ? isKnockoutMatchScorableForUserByMatchNumber(ctx, userResolved, input.matchId)
      : { scorable: true };

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
      : 0;

    const predictedAdvancer = predictedAdvancingTeamId({
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
          gated: !gate.scorable,
          gateReason: gate.reason,
          blockedTeams: gate.blockedTeams,
        },
      },
      { onConflict: "user_id,bonus_key" }
    );

    if (error) throw new Error(error.message);
    scored += 1;
  }

  return scored;
}
