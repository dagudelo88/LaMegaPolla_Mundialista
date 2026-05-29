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
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  invite_redeemed_at: string | null;
  joined_at: string;
}

export interface AppConfigRow {
  key: string;
  value: unknown;
  description: string | null;
}
