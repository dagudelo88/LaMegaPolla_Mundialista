-- Phase 0: profiles, invitation_codes, app_config, RLS, auth trigger

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'participant'
    check (role in ('participant', 'admin')),
  username text unique,
  display_name text,
  avatar_url text,
  total_points integer not null default 0,
  invite_redeemed_at timestamptz,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists profiles_role_idx on public.profiles (role);

create table if not exists public.invitation_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_by uuid references public.profiles (id),
  redeemed_by uuid references public.profiles (id),
  redeemed_at timestamptz,
  expires_at timestamptz,
  max_uses integer not null default 1 check (max_uses >= 1),
  uses_count integer not null default 0 check (uses_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists invitation_codes_code_idx on public.invitation_codes (code);

create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value, description) values
  ('scoring.group.exact', '10', 'REGLAS §4: marcador exacto (grupos)'),
  ('scoring.group.winner_only', '5', 'REGLAS §4: ganador/empate distinto (grupos)'),
  ('scoring.knockout.exact', '20', 'REGLAS §4: eliminatorias exacto'),
  ('scoring.knockout.winner_only', '10', 'REGLAS §4: eliminatorias ganador/empate'),
  ('scoring.advancement_bonus_per_team', '2', 'REGLAS §4: +2 por equipo que avanza'),
  ('changes.cost.group', '3', 'REGLAS §5: costo cambio grupos'),
  ('changes.cost.knockout', '9', 'REGLAS §5: costo cambio octavos+'),
  ('changes.knockout_from_phase', '"round_of_16"', 'REGLAS §5'),
  ('changes.max_per_day', '1', 'REGLAS §5'),
  ('bonus.matchday.correct_match', '3', 'REGLAS §6'),
  ('bonus.matchday.exact_total_goals', '5', 'REGLAS §6'),
  ('pool.first_place_pct', '70', 'REGLAS §12'),
  ('pool.second_place_pct', '15', 'REGLAS §12'),
  ('pool.third_place_pct', '10', 'REGLAS §12'),
  ('pool.admin_pct', '5', 'REGLAS §12')
on conflict (key) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'participant')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.redeem_invitation_code(p_code text, p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.invitation_codes%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_username is null or length(trim(p_username)) < 3 then
    raise exception 'username_too_short';
  end if;

  select * into v_row
  from public.invitation_codes
  where upper(code) = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'invalid_code';
  end if;

  if v_row.expires_at is not null and v_row.expires_at < now() then
    raise exception 'expired_code';
  end if;

  if v_row.uses_count >= v_row.max_uses then
    raise exception 'code_exhausted';
  end if;

  if exists (
    select 1 from public.profiles
    where username = trim(p_username) and id <> v_uid
  ) then
    raise exception 'username_taken';
  end if;

  update public.profiles
  set
    username = trim(p_username),
    invite_redeemed_at = now()
  where id = v_uid;

  update public.invitation_codes
  set
    uses_count = uses_count + 1,
    redeemed_by = coalesce(redeemed_by, v_uid),
    redeemed_at = coalesce(redeemed_at, now())
  where id = v_row.id;
end;
$$;

revoke all on function public.redeem_invitation_code(text, text) from public;
grant execute on function public.redeem_invitation_code(text, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.invitation_codes enable row level security;
alter table public.app_config enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists profiles_select_public_usernames on public.profiles;
create policy profiles_select_public_usernames
  on public.profiles for select
  to authenticated
  using (username is not null);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all
  on public.profiles for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists app_config_select_authenticated on public.app_config;
create policy app_config_select_authenticated
  on public.app_config for select
  to authenticated
  using (true);
