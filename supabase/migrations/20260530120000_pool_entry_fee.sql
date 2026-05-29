insert into public.app_config (key, value, description) values
  ('pool.entry_fee', '50000', 'Aporte por participante activo (REGLAS §12; moneda en pool.currency)'),
  ('pool.currency', '"COP"', 'Moneda ISO 4217 del pool')
on conflict (key) do nothing;
