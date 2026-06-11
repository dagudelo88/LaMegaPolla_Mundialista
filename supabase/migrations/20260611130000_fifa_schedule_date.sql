-- Official FIFA calendar date (venue-local civil date) for schedule grouping and jornadas.
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS fifa_schedule_date date;

CREATE INDEX IF NOT EXISTS matches_fifa_schedule_date_kickoff_idx
  ON public.matches (fifa_schedule_date, kickoff_at);
