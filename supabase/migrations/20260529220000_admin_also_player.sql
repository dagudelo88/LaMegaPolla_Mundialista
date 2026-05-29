-- Admin y jugador: is_admin para panel; role siempre participant para jugar la polla.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

update public.profiles
set is_admin = true
where role = 'admin';

update public.profiles
set role = 'participant'
where role = 'admin';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean := false;
begin
  if lower(coalesce(new.email, '')) = lower('dagudelo88@gmail.com') then
    v_is_admin := true;
  end if;

  insert into public.profiles (id, role, is_admin)
  values (new.id, 'participant', v_is_admin)
  on conflict (id) do update
    set
      is_admin = public.profiles.is_admin or excluded.is_admin,
      role = 'participant';

  return new;
end;
$$;

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all
  on public.profiles for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists bug_reports_admin on public.bug_reports;
create policy bug_reports_admin on public.bug_reports for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
