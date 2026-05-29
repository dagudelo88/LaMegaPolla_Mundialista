-- Pronósticos: matchday_key, prediction_changes INSERT, deadline offset config

alter table public.matches
  add column if not exists matchday_key text;

create index if not exists matches_matchday_key_idx on public.matches (matchday_key);

insert into public.app_config (key, value, description) values
  ('tournament.deadline_offset_minutes', '60', 'Minutos antes del kickoff para prediction_deadline')
on conflict (key) do nothing;

-- Users may insert their own prediction change records (paid changes REGLAS §5)
create policy prediction_changes_insert_own on public.prediction_changes
  for insert to authenticated
  with check (auth.uid() = user_id);
