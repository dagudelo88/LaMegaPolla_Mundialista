-- Public read for official schedule and results (no auth required)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'teams' and policyname = 'teams_select_anon'
  ) then
    create policy teams_select_anon on public.teams for select to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'matches' and policyname = 'matches_select_anon'
  ) then
    create policy matches_select_anon on public.matches for select to anon using (true);
  end if;
end $$;
