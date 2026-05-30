import {
  getJornadaKey,
  groupMatchesByJornada,
  isJornadaComplete,
  isJornadaEligible,
  resolveJornadaWinners,
  type JornadaMatchRef,
} from "@/lib/jornada/helpers";
import { resolveUserPredictedTopScorer } from "@/lib/jornada/resolve-predicted-top-scorer";
import {
  calculateJornadaBonus,
  DEFAULT_JORNADA_BONUS_CONFIG,
  type JornadaBonusConfig,
} from "@/lib/scoring/calculate-jornada-bonus";

export interface JornadaResultRow {
  jornada_key: string;
  max_total_goals: number;
  winning_match_ids: string[];
  is_tie: boolean;
}

export interface JornadaMatchBonusInfo {
  bonus: number;
  isTopScorerPick: boolean;
  predictedTotalGoals: number | null;
}

interface JornadaMatch extends JornadaMatchRef {
  id: string;
  fifa_match_number: number | null;
  home_score: number | null;
  away_score: number | null;
}

function resolveJornadaResult(
  jornadaKey: string,
  jornadaMatches: JornadaMatch[],
  resultByKey: Map<string, JornadaResultRow>
): JornadaResultRow | null {
  const stored = resultByKey.get(jornadaKey);
  if (stored) return stored;

  if (!isJornadaComplete(jornadaMatches)) return null;

  const finishedGoals = jornadaMatches.map((m) => ({
    id: m.id,
    totalGoals: (m.home_score ?? 0) + (m.away_score ?? 0),
  }));
  const { maxTotalGoals, winningMatchIds, isTie } = resolveJornadaWinners(finishedGoals);

  return {
    jornada_key: jornadaKey,
    max_total_goals: maxTotalGoals,
    winning_match_ids: isTie ? [] : winningMatchIds,
    is_tie: isTie,
  };
}

export function computeJornadaBonusByMatchId(input: {
  matches: JornadaMatch[];
  predictions: { match_id: string; predicted_home: number; predicted_away: number }[];
  jornadaResults: JornadaResultRow[];
  config?: JornadaBonusConfig;
}): Map<string, JornadaMatchBonusInfo> {
  const config = input.config ?? DEFAULT_JORNADA_BONUS_CONFIG;
  const grouped = groupMatchesByJornada(input.matches);
  const resultByKey = new Map(input.jornadaResults.map((r) => [r.jornada_key, r]));
  const predByMatchId = new Map(input.predictions.map((p) => [p.match_id, p]));
  const out = new Map<string, JornadaMatchBonusInfo>();

  for (const [jornadaKey, jornadaMatches] of grouped) {
    if (!isJornadaEligible(jornadaMatches)) continue;

    const jornadaPredictions = jornadaMatches
      .map((m) => {
        const pred = predByMatchId.get(m.id);
        if (!pred) return null;
        return {
          matchId: m.id,
          fifaMatchNumber: m.fifa_match_number ?? 0,
          predictedTotalGoals: pred.predicted_home + pred.predicted_away,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p != null);

    const topScorer = resolveUserPredictedTopScorer(jornadaPredictions);
    if (!topScorer) continue;

    const jornadaResult = resolveJornadaResult(jornadaKey, jornadaMatches, resultByKey);
    let bonus = 0;

    if (jornadaResult) {
      const pickedMatch = jornadaMatches.find((m) => m.id === topScorer.matchId);
      const actualTotalGoals = pickedMatch
        ? (pickedMatch.home_score ?? 0) + (pickedMatch.away_score ?? 0)
        : 0;

      bonus = calculateJornadaBonus({
        pickedMatchId: topScorer.matchId,
        winningMatchIds: jornadaResult.winning_match_ids,
        isTie: jornadaResult.is_tie,
        predictedTotalGoals: topScorer.predictedTotalGoals,
        actualTotalGoals,
        config,
      });
    }

    out.set(topScorer.matchId, {
      bonus,
      isTopScorerPick: true,
      predictedTotalGoals: topScorer.predictedTotalGoals,
    });
  }

  return out;
}

export function collectJornadaKeysFromMatches(
  matches: { kickoff_at: string }[]
): string[] {
  return [...new Set(matches.map((m) => getJornadaKey(m.kickoff_at)))];
}
