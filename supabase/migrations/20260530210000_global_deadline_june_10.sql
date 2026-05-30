-- REGLAS §2–§3: global deadline = 10 jun 2026 23:59 America/Bogota (2026-06-11T04:59:59Z)

update public.app_config
set
  value = '"2026-06-11T04:59:59Z"'::jsonb,
  description = 'REGLAS §2–§3: fecha límite global (10 jun 2026 23:59 hora Colombia)',
  updated_at = now()
where key = 'tournament.global_deadline';
