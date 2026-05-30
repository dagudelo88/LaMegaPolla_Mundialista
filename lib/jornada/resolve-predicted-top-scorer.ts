export interface UserJornadaPrediction {
  matchId: string;
  fifaMatchNumber: number;
  predictedTotalGoals: number;
}

/** Implicit pick = match with highest predicted total goals in the jornada (tie → lowest FIFA #). */
export function resolveUserPredictedTopScorer(
  predictions: UserJornadaPrediction[]
): { matchId: string; predictedTotalGoals: number } | null {
  if (!predictions.length) return null;

  const maxGoals = Math.max(...predictions.map((p) => p.predictedTotalGoals));
  const tied = predictions.filter((p) => p.predictedTotalGoals === maxGoals);
  const winner = [...tied].sort((a, b) => a.fifaMatchNumber - b.fifaMatchNumber)[0]!;

  return { matchId: winner.matchId, predictedTotalGoals: maxGoals };
}
