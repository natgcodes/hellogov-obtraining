│
◇  Downloading snippet...
-- QUERY 218
-- Get Progress Functions
-- READ ONLY

SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_learner_journey_days',
    'get_trainer_impersonated_journey_days',
    'is_day_complete',
    'get_program_progress',
    'recalculate_program_enrollment',
    'get_learner_day_progress',
    'get_trainer_impersonated_day_progress'
  )
  AND p.prokind = 'f'
ORDER BY p.proname;
