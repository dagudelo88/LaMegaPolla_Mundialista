-- Admin único: dagudelo88@gmail.com

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := 'participant';
begin
  if lower(coalesce(new.email, '')) = lower('dagudelo88@gmail.com') then
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

update public.profiles
set role = 'admin'
where id in (
  select id from auth.users where lower(email) = lower('dagudelo88@gmail.com')
);
