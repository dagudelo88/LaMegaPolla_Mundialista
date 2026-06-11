-- Allow admins to grant individual players extra time to fill and submit predictions.

alter table public.profiles
  add column if not exists late_submission_until timestamptz;

comment on column public.profiles.late_submission_until is
  'When set and in the future, this player may save and submit predictions after the global deadline.';
