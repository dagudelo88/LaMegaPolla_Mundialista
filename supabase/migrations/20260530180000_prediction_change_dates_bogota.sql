-- Recalculate change_date using Colombia timezone (America/Bogota).

update public.prediction_changes
set change_date = (
  (created_at at time zone 'UTC') at time zone 'America/Bogota'
)::date;
