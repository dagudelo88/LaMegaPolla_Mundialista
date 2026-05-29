-- Official knockout: who advances after 90' draw (penalties / extra time outcome for bracket only)
alter table public.matches
  add column if not exists result_advances_team_id integer references public.teams (id);
