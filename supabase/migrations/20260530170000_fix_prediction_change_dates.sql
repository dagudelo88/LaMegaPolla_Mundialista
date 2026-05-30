-- Recalculate change_date using app timezone (America/Bogota), not UTC.
-- Fixes daily limit counting changes from the previous local day as "today".

update public.prediction_changes
set change_date = (
  (created_at at time zone 'UTC') at time zone 'America/Bogota'
)::date;
