-- Track entry fee payment and voluntary admin withdrawal from the pool.

alter table public.profiles
  add column if not exists entry_fee_paid boolean not null default false,
  add column if not exists withdrawn_at timestamptz,
  add column if not exists withdrawn_by uuid references public.profiles (id);

create index if not exists profiles_active_participant_idx
  on public.profiles (invite_redeemed_at, withdrawn_at, entry_fee_paid)
  where invite_redeemed_at is not null and withdrawn_at is null;

-- Existing registered players count as paid until admin changes it.
update public.profiles
set entry_fee_paid = true
where invite_redeemed_at is not null
  and withdrawn_at is null;

-- Extend profile RPC used by middleware/layout.
create or replace function public.get_my_profile()
returns table (
  id uuid,
  role text,
  is_admin boolean,
  username text,
  total_points integer,
  invite_redeemed_at timestamptz,
  entry_fee_paid boolean,
  withdrawn_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.role,
    p.is_admin,
    p.username,
    p.total_points,
    p.invite_redeemed_at,
    p.entry_fee_paid,
    p.withdrawn_at
  from public.profiles p
  where p.id = auth.uid();
$$;
