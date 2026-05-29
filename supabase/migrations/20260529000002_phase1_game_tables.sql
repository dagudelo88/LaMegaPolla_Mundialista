-- Phase 1+: teams, matches, predictions, bracket, submissions, bonuses, changes, bugs

create table if not exists public.teams (
  id serial primary key,
  fifa_code char(3) unique not null,
  name_es text not null,
  name_en text not null,
  group_letter char(1) not null check (group_letter between 'A' and 'L'),
  confederation text,
  flag_emoji text,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  fifa_match_number integer unique,
  phase text not null check (phase in (
    'group_stage', 'round_of_32', 'round_of_16',
    'quarter_final', 'semi_final', 'third_place', 'final'
  )),
  group_letter char(1),
  home_team_id integer references public.teams (id),
  away_team_id integer references public.teams (id),
  home_source jsonb,
  away_source jsonb,
  kickoff_at timestamptz not null,
  venue text,
  prediction_deadline timestamptz not null,
  home_score integer,
  away_score integer,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  predicted_home integer not null check (predicted_home between 0 and 20),
  predicted_away integer not null check (predicted_away between 0 and 20),
  predicted_is_draw boolean not null default false,
  predicted_advances_team_id integer references public.teams (id),
  submitted_at timestamptz not null default now(),
  locked boolean not null default false,
  admin_overridden boolean not null default false,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create table if not exists public.bracket_picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  pick_type text not null,
  team_id integer references public.teams (id),
  round_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, pick_type, round_key)
);

create table if not exists public.user_tournament_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  is_complete boolean not null default false
);

create table if not exists public.prediction_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  prediction_id uuid not null references public.predictions (id),
  old_home integer not null,
  old_away integer not null,
  new_home integer not null,
  new_away integer not null,
  points_spent integer not null,
  change_date date not null default (current_date),
  created_at timestamptz not null default now()
);

create table if not exists public.matchday_bonuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  matchday_key text not null,
  match_id uuid not null references public.matches (id),
  predicted_total_goals integer,
  created_at timestamptz not null default now(),
  unique (user_id, matchday_key)
);

create table if not exists public.user_match_points (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  points integer not null default 0,
  breakdown jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create table if not exists public.admin_actions (
  id bigserial primary key,
  admin_id uuid references public.profiles (id),
  action text not null,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  description text not null,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'closed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value, description) values
  ('tournament.global_deadline', '"2026-06-11T00:00:00Z"', 'REGLAS §3: fecha límite pronóstico inicial')
on conflict (key) do nothing;

alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.bracket_picks enable row level security;
alter table public.user_tournament_submissions enable row level security;
alter table public.prediction_changes enable row level security;
alter table public.matchday_bonuses enable row level security;
alter table public.user_match_points enable row level security;
alter table public.admin_actions enable row level security;
alter table public.bug_reports enable row level security;

create policy teams_select_all on public.teams for select to authenticated using (true);

create policy matches_select_all on public.matches for select to authenticated using (true);

create policy predictions_select_all on public.predictions for select to authenticated using (true);

create policy predictions_insert_own on public.predictions for insert to authenticated
  with check (auth.uid() = user_id and locked = false);

create policy predictions_update_own on public.predictions for update to authenticated
  using (auth.uid() = user_id and locked = false)
  with check (auth.uid() = user_id);

create policy bracket_picks_own on public.bracket_picks for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy submissions_own on public.user_tournament_submissions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy prediction_changes_select_own on public.prediction_changes for select to authenticated
  using (auth.uid() = user_id);

create policy matchday_bonuses_own on public.matchday_bonuses for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy user_match_points_select on public.user_match_points for select to authenticated using (true);

create policy bug_reports_insert_own on public.bug_reports for insert to authenticated
  with check (auth.uid() = user_id);

create policy bug_reports_select_own on public.bug_reports for select to authenticated
  using (auth.uid() = user_id);

create policy bug_reports_admin on public.bug_reports for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
