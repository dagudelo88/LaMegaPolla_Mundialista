-- Allow transparency page to read bracket-gate scoring correction snapshots.

drop policy if exists admin_actions_select_corrections on public.admin_actions;

create policy admin_actions_select_corrections
  on public.admin_actions
  for select
  to authenticated
  using (
    action in (
      'override_prediction',
      'correct_match_result',
      'set_match_result',
      'bracket_gate_scoring_correction'
    )
  );
