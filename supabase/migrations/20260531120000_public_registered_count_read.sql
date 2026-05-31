-- Allow anon/authenticated clients to count registered participants (paid or pending).

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_registered_anon'
  ) then
    create policy profiles_select_registered_anon
      on public.profiles
      for select
      to anon
      using (
        username is not null
        and invite_redeemed_at is not null
        and withdrawn_at is null
      );
  end if;
end $$;
