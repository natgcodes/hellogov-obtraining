│
◇  Downloading snippet...
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_day_complete',
    'get_learner_journey_days',
    'recalculate_program_enrollment',
    'get_program_progress'
  )
ORDER BY p.proname;
