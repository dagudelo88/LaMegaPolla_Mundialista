export type ProfileRole = "participant" | "admin";

export type MatchPhase =
  | "group_stage"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final";

export interface Profile {
  id: string;
  role: ProfileRole;
  is_admin: boolean;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  invite_redeemed_at: string | null;
  entry_fee_paid: boolean;
  withdrawn_at: string | null;
  joined_at: string;
  late_submission_until?: string | null;
}

export interface AppConfigRow {
  key: string;
  value: unknown;
  description: string | null;
}

export interface Team {
  id: number;
  fifa_code: string;
  name_es: string;
  name_en: string;
  group_letter: string;
  flag_emoji: string | null;
  confederation?: string | null;
  fifa_ranking?: number | null;
  team_conduct_score?: number;
  manual_tie_break_rank?: number | null;
}

export interface Match {
  id: string;
  fifa_match_number: number | null;
  phase: MatchPhase;
  group_letter: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_source: unknown;
  away_source: unknown;
  kickoff_at: string;
  fifa_schedule_date: string;
  prediction_deadline: string;
  venue: string | null;
  matchday_key: string | null;
  status: string;
  home_score?: number | null;
  away_score?: number | null;
  result_advances_team_id?: number | null;
}

export interface MatchWithTeams extends Match {
  home_team?: Pick<Team, "id" | "fifa_code" | "name_es" | "flag_emoji"> | null;
  away_team?: Pick<Team, "id" | "fifa_code" | "name_es" | "flag_emoji"> | null;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  predicted_home: number;
  predicted_away: number;
  predicted_is_draw: boolean;
  predicted_advances_team_id: number | null;
  locked: boolean;
  admin_overridden?: boolean;
  admin_note?: string | null;
  submitted_at?: string;
}

export interface PredictionChange {
  id: string;
  user_id: string;
  prediction_id: string;
  match_id: string | null;
  old_home: number;
  old_away: number;
  new_home: number;
  new_away: number;
  old_advances_team_id: number | null;
  new_advances_team_id: number | null;
  points_spent: number;
  change_date: string;
  created_at: string;
}

export interface PredictionAdminOverride {
  id: string;
  admin_id: string;
  user_id: string;
  prediction_id: string | null;
  match_id: string;
  old_home: number | null;
  old_away: number | null;
  old_advances_team_id: number | null;
  new_home: number;
  new_away: number;
  new_advances_team_id: number | null;
  admin_note: string;
  created_at: string;
}

export type TransparencyEntryKind =
  | "paid_change"
  | "admin_prediction"
  | "result_correction"
  | "scoring_correction";

export interface TransparencyMatchTeam {
  name: string;
  fifaCode: string;
}

export interface TransparencyScoreChange {
  beforeHome: number | null;
  beforeAway: number | null;
  afterHome: number | null;
  afterAway: number | null;
  beforeAdvancesTeam: TransparencyMatchTeam | null;
  afterAdvancesTeam: TransparencyMatchTeam | null;
}

export interface TransparencyEntry {
  id: string;
  kind: TransparencyEntryKind;
  createdAt: string;
  playerUsername: string;
  actorUsername?: string;
  matchNumber: number | null;
  matchLabel: string;
  phaseLabel: string | null;
  homeTeam: TransparencyMatchTeam | null;
  awayTeam: TransparencyMatchTeam | null;
  beforeScore: string;
  afterScore: string;
  scoreChange: TransparencyScoreChange;
  pointsSpent?: number;
  reason?: string;
}

export interface BracketPick {
  id: string;
  user_id: string;
  pick_type: string;
  team_id: number | null;
  round_key: string | null;
}

export interface UserTournamentSubmission {
  id: string;
  user_id: string;
  submitted_at: string;
  is_complete: boolean;
}

export interface MatchdayBonus {
  id: string;
  user_id: string;
  matchday_key: string;
  match_id: string;
  predicted_total_goals: number | null;
  created_at: string;
}

export interface JornadaResult {
  jornada_key: string;
  max_total_goals: number;
  winning_match_ids: string[];
  is_tie: boolean;
  settled_at: string;
}

export interface UserJornadaBonusPoints {
  id: number;
  user_id: string;
  jornada_key: string;
  points: number;
  breakdown: Record<string, unknown> | null;
  created_at: string;
}

export const GROUP_LETTERS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
] as const;

export type GroupLetter = (typeof GROUP_LETTERS)[number];

export const PHASE_LABELS: Record<MatchPhase, string> = {
  group_stage: "Fase de grupos",
  round_of_32: "Dieciseisavos de final",
  round_of_16: "Octavos de final",
  quarter_final: "Cuartos de final",
  semi_final: "Semifinales",
  third_place: "Tercer puesto",
  final: "Final",
};
