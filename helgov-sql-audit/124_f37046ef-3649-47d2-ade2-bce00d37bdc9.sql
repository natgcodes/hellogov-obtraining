│
◇  Downloading snippet...
-- QUERY 205
-- Review Module Creation & Access Functions
-- READ ONLY

SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_day_module',
    'can_access_quiz',
    'get_learner_day_progress',
    'get_trainer_impersonated_journey_days'
  )
  AND p.prokind = 'f'
ORDER BY p.proname;
