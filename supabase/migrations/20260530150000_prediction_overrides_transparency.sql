-- Admin prediction overrides + transparency log extensions

create table if not exists public.prediction_admin_overrides (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id),
  user_id uuid not null references public.profiles (id) on delete cascade,
  prediction_id uuid references public.predictions (id),
  match_id uuid not null references public.matches (id),
  old_home integer,
  old_away integer,
  old_advances_team_id integer,
  new_home integer not null,
  new_away integer not null,
  new_advances_team_id integer,
  admin_note text not null check (char_length(trim(admin_note)) >= 10),
  created_at timestamptz not null default now()
);

create index if not exists prediction_admin_overrides_user_created_idx
  on public.prediction_admin_overrides (user_id, created_at desc);

create index if not exists prediction_admin_overrides_match_idx
  on public.prediction_admin_overrides (match_id);

create index if not exists prediction_admin_overrides_admin_idx
  on public.prediction_admin_overrides (admin_id);

alter table public.prediction_admin_overrides enable row level security;

create policy prediction_admin_overrides_select_all
  on public.prediction_admin_overrides
  for select
  to authenticated
  using (true);

-- Extend paid-change audit log for transparency page
alter table public.prediction_changes
  add column if not exists match_id uuid references public.matches (id),
  add column if not exists old_advances_team_id integer,
  add column if not exists new_advances_team_id integer;

update public.prediction_changes pc
set match_id = p.match_id
from public.predictions p
where pc.prediction_id = p.id
  and pc.match_id is null;

drop policy if exists prediction_changes_select_own on public.prediction_changes;

create policy prediction_changes_select_all
  on public.prediction_changes
  for select
  to authenticated
  using (true);

-- Allow reading correction-related admin actions on transparency page
create policy admin_actions_select_corrections
  on public.admin_actions
  for select
  to authenticated
  using (
    action in (
      'override_prediction',
      'correct_match_result',
      'set_match_result'
    )
  );
