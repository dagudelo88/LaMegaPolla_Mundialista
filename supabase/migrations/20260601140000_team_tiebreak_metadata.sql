alter table public.teams
  add column if not exists fifa_ranking integer,
  add column if not exists team_conduct_score integer not null default 0,
  add column if not exists manual_tie_break_rank integer;

