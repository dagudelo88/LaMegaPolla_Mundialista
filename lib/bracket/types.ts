export type BracketSlot =
  | { type: "group_rank"; group: string; rank: number }
  | { type: "third_best"; eligible_groups: string[] }
  | { type: "match_winner"; match_number: number }
  | { type: "match_loser"; match_number: number };

export interface TeamRef {
  id: number;
  fifaCode: string;
  groupLetter: string;
  /** FIFA team conduct score. Higher is better; card deductions make this negative. */
  teamConductScore?: number;
  /** FIFA/Coca-Cola men's ranking position. Lower is better. */
  fifaRanking?: number | null;
  /** Admin-controlled fallback for FIFA drawing of lots or unresolved data. Lower is better. */
  manualTieBreakRank?: number | null;
}

export interface GroupMatchResult {
  homeTeamId: number;
  awayTeamId: number;
  homeGoals: number;
  awayGoals: number;
}

export interface StandingRow {
  rank: number;
  teamId: number;
  fifaCode: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  gc: number;
  gd: number;
  pts: number;
  teamConductScore: number;
  fifaRanking: number | null;
  manualTieBreakRank: number | null;
}

export interface GroupStanding {
  group: string;
  positions: StandingRow[];
}

export interface ResolvedMatchTeams {
  homeTeamId: number | null;
  awayTeamId: number | null;
  unresolved: boolean;
}

export interface KnockoutMatchDef {
  fifaMatchNumber: number;
  phase: string;
  homeSource: BracketSlot;
  awaySource: BracketSlot;
}

export interface PredictionScore {
  matchId: string;
  matchNumber: number;
  phase: string;
  predictedHome: number;
  predictedAway: number;
  predictedIsDraw?: boolean;
  predictedAdvancesTeamId?: number | null;
}

export interface KnockoutPredictionScores {
  predictedHome: number;
  predictedAway: number;
  predictedAdvancesTeamId?: number | null;
}

export interface MatchWinnerContext extends KnockoutPredictionScores {
  matchNumber: number;
  homeTeamId: number;
  awayTeamId: number;
}
