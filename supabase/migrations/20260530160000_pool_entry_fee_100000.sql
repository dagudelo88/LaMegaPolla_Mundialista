-- REGLAS §12 — aporte por participante: $100.000 COP
update public.app_config
set value = '100000'
where key = 'pool.entry_fee';
