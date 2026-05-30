-- Knockout slots were sometimes filled from alphabetical tie-breaks with zero group results.
-- Official schedule should show placeholders until group stage (and prior knockouts) finish.
UPDATE public.matches
SET
  home_team_id = NULL,
  away_team_id = NULL,
  updated_at = now()
WHERE phase <> 'group_stage'
  AND (home_team_id IS NOT NULL OR away_team_id IS NOT NULL);
