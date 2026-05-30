-- REGLAS §6: bonus por jornada (día calendario Colombia) — partido más goleador

create table if not exists public.jornada_results (
  jornada_key text primary key,
  max_total_goals integer not null,
  winning_match_ids uuid[] not null default '{}',
  is_tie boolean not null default false,
  settled_at timestamptz not null default now()
);

create table if not exists public.user_jornada_bonus_points (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  jornada_key text not null,
  points integer not null default 0,
  breakdown jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, jornada_key)
);

create index if not exists user_jornada_bonus_points_user_idx
  on public.user_jornada_bonus_points (user_id);

insert into public.app_config (key, value, description) values
  ('scoring.jornada_bonus.match', '3', 'REGLAS §6: acierto de partido más goleador'),
  ('scoring.jornada_bonus.exact', '5', 'REGLAS §6: acierto + goles totales exactos del partido')
on conflict (key) do nothing;

alter table public.jornada_results enable row level security;
alter table public.user_jornada_bonus_points enable row level security;

create policy jornada_results_select_all on public.jornada_results
  for select to authenticated using (true);

create policy user_jornada_bonus_points_select on public.user_jornada_bonus_points
  for select to authenticated using (true);

create policy jornada_results_select_anon on public.jornada_results
  for select to anon using (true);
