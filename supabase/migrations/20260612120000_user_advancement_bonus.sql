-- REGLAS §4: +2 por avance correcto (partido y ronda)

create table if not exists public.user_advancement_bonus_points (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  bonus_key text not null,
  points integer not null default 0,
  breakdown jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, bonus_key)
);

create index if not exists user_advancement_bonus_points_user_idx
  on public.user_advancement_bonus_points (user_id);

alter table public.user_advancement_bonus_points enable row level security;

create policy user_advancement_bonus_points_select on public.user_advancement_bonus_points
  for select to authenticated using (true);

create policy user_advancement_bonus_points_select_anon on public.user_advancement_bonus_points
  for select to anon using (true);
