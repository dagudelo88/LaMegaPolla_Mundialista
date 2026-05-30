insert into public.app_config (key, value, description)
values (
  'pool.public_predictions_enabled',
  'false'::jsonb,
  'Permite a participantes ver pronósticos ajenos desde la tabla de posiciones'
)
on conflict (key) do nothing;
