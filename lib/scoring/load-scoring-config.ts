import { getConfigNumber } from "@/lib/config/get-config";
import {
  DEFAULT_SCORING_CONFIG,
  type ScoringConfig,
} from "@/lib/scoring/calculate-match-points";

export async function loadScoringConfig(): Promise<ScoringConfig> {
  const [groupExact, groupWinnerOnly, knockoutExact, knockoutWinnerOnly] =
    await Promise.all([
      getConfigNumber("scoring.group.exact", DEFAULT_SCORING_CONFIG.groupExact),
      getConfigNumber(
        "scoring.group.winner_only",
        DEFAULT_SCORING_CONFIG.groupWinnerOnly
      ),
      getConfigNumber(
        "scoring.knockout.exact",
        DEFAULT_SCORING_CONFIG.knockoutExact
      ),
      getConfigNumber(
        "scoring.knockout.winner_only",
        DEFAULT_SCORING_CONFIG.knockoutWinnerOnly
      ),
    ]);

  return { groupExact, groupWinnerOnly, knockoutExact, knockoutWinnerOnly };
}
