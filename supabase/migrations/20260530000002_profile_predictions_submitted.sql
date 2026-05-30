-- Expose tournament submission status for post-auth landing redirects.

drop function if exists public.get_my_profile();

create or replace function public.get_my_profile()
returns table (
  id uuid,
  role text,
  is_admin boolean,
  username text,
  total_points integer,
  invite_redeemed_at timestamptz,
  entry_fee_paid boolean,
  withdrawn_at timestamptz,
  predictions_submitted boolean
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
    p.withdrawn_at,
    coalesce(uts.is_complete, false) as predictions_submitted
  from public.profiles p
  left join public.user_tournament_submissions uts on uts.user_id = p.id
  where p.id = auth.uid();
$$;
