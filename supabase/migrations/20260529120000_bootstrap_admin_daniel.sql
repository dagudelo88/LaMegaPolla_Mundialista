-- Bootstrap: daniel.agudelo@gmail.com becomes admin on first sign-up.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := 'participant';
begin
  if lower(coalesce(new.email, '')) = lower('daniel.agudelo@gmail.com') then
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

-- One-time invite for the bootstrap admin (canjear en /join).
insert into public.invitation_codes (code, max_uses, uses_count)
values ('MEGA-DANIEL', 1, 0)
on conflict (code) do nothing;
