-- Public read for leaderboard + pool config (anon key / cached home page).
-- Matches lib/participants/is-active-participant.ts and load-leaderboard.ts filters.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_leaderboard_anon'
  ) then
    create policy profiles_select_leaderboard_anon
      on public.profiles
      for select
      to anon
      using (
        username is not null
        and invite_redeemed_at is not null
        and withdrawn_at is null
        and (entry_fee_paid = true or is_admin = true)
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_config' and policyname = 'app_config_select_anon'
  ) then
    create policy app_config_select_anon
      on public.app_config
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_match_points' and policyname = 'user_match_points_select_anon'
  ) then
    create policy user_match_points_select_anon
      on public.user_match_points
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prediction_changes' and policyname = 'prediction_changes_select_anon'
  ) then
    create policy prediction_changes_select_anon
      on public.prediction_changes
      for select
      to anon
      using (true);
  end if;
end $$;
