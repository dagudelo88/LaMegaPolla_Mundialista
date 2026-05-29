-- Admin bootstrap (histórico): reemplazado por 20260529200000_admin_dagudelo88_only.sql

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := 'participant';
  v_email text := lower(coalesce(new.email, ''));
begin
  if v_email in (
    lower('daniel.agudelo@gmail.com'),
    lower('dagudelo88@gmail.com')
  ) then
    v_role := 'admin';
  end if;

  insert into public.profiles (id, role)
  values (new.id, v_role)
  on conflict (id) do update
    set role = case
      when excluded.role = 'admin' then 'admin'
      else public.profiles.role
    end;

  return new;
end;
$$;

-- Cuenta ya creada antes de esta migración
update public.profiles
set role = 'admin'
where id in (
  select id from auth.users
  where lower(email) in (
    lower('daniel.agudelo@gmail.com'),
    lower('dagudelo88@gmail.com')
  )
);
