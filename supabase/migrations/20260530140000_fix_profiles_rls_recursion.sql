-- Fix infinite recursion in profiles RLS: admin policies must not subquery profiles
-- under the same RLS context. Use a security definer helper instead.

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all
  on public.profiles
  for all
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

drop policy if exists bug_reports_admin on public.bug_reports;
create policy bug_reports_admin
  on public.bug_reports
  for all
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());
