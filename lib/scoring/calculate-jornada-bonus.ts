export interface JornadaBonusConfig {
  match: number;
  exact: number;
}

export const DEFAULT_JORNADA_BONUS_CONFIG: JornadaBonusConfig = {
  match: 3,
  exact: 5,
};

export interface CalculateJornadaBonusInput {
  pickedMatchId: string;
  winningMatchIds: string[];
  isTie: boolean;
  predictedTotalGoals: number;
  actualTotalGoals: number;
  config?: JornadaBonusConfig;
}

export function calculateJornadaBonus(input: CalculateJornadaBonusInput): number {
  const config = input.config ?? DEFAULT_JORNADA_BONUS_CONFIG;

  if (input.isTie || input.winningMatchIds.length === 0) {
    return 0;
  }

  if (!input.winningMatchIds.includes(input.pickedMatchId)) {
    return 0;
  }

  if (input.predictedTotalGoals === input.actualTotalGoals) {
    return config.exact;
  }

  return config.match;
}
