import {
  getJornadaFirstKickoff,
  getJornadaKey,
  groupMatchesByJornada,
  isJornadaEligible,
  isJornadaPickOpen,
  type JornadaMatchRef,
} from "@/lib/jornada/helpers";
import { resolveUserPredictedTopScorer } from "@/lib/jornada/resolve-predicted-top-scorer";

export interface JornadaMeta {
  jornadaKey: string;
  matchCount: number;
  eligible: boolean;
  firstKickoff: string;
  pickOpen: boolean;
  settled: boolean;
  isTie: boolean;
  maxTotalGoals: number | null;
  winningMatchIds: string[];
  /** Derived from predictions: highest predicted total goals in the jornada */
  predictedTopScorerMatchId: string | null;
  predictedTopScorerGoals: number | null;
  earnedPoints: number | null;
}

interface JornadaMatch extends JornadaMatchRef {
  id: string;
  fifa_match_number: number | null;
}

interface BuildJornadaMetaInput {
  matches: JornadaMatch[];
  predictions: { match_id: string; predicted_home: number; predicted_away: number }[];
  jornadaResults: {
    jornada_key: string;
    is_tie: boolean;
    max_total_goals: number;
    winning_match_ids: string[];
  }[];
  userJornadaBonusPoints: { jornada_key: string; points: number }[];
  now?: Date;
}

export function buildJornadaMetaByKey(input: BuildJornadaMetaInput): Record<string, JornadaMeta> {
  const grouped = groupMatchesByJornada(input.matches);
  const predByMatchId = new Map(input.predictions.map((p) => [p.match_id, p]));
  const resultByKey = new Map(input.jornadaResults.map((r) => [r.jornada_key, r]));
  const pointsByKey = new Map(
    input.userJornadaBonusPoints.map((p) => [p.jornada_key, p.points])
  );
  const now = input.now ?? new Date();
  const meta: Record<string, JornadaMeta> = {};

  for (const [jornadaKey, jornadaMatches] of grouped) {
    const result = resultByKey.get(jornadaKey);
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

    meta[jornadaKey] = {
      jornadaKey,
      matchCount: jornadaMatches.length,
      eligible: isJornadaEligible(jornadaMatches),
      firstKickoff: getJornadaFirstKickoff(jornadaMatches),
      pickOpen: isJornadaPickOpen(jornadaMatches, now),
      settled: Boolean(result),
      isTie: result?.is_tie ?? false,
      maxTotalGoals: result?.max_total_goals ?? null,
      winningMatchIds: result?.winning_match_ids ?? [],
      predictedTopScorerMatchId: topScorer?.matchId ?? null,
      predictedTopScorerGoals: topScorer?.predictedTotalGoals ?? null,
      earnedPoints: pointsByKey.has(jornadaKey) ? (pointsByKey.get(jornadaKey) ?? 0) : null,
    };
  }

  return meta;
}

export function sortJornadaKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => a.localeCompare(b));
}

export { getJornadaKey };
