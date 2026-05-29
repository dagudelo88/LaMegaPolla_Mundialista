-- Lectura fiable del perfil del usuario autenticado (evita fallos RLS/caché en layout).

create or replace function public.get_my_profile()
returns table (
  id uuid,
  role text,
  is_admin boolean,
  username text,
  total_points integer,
  invite_redeemed_at timestamptz
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
    p.invite_redeemed_at
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;
