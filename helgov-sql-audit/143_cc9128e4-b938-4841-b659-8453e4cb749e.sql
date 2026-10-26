│
◇  Downloading snippet...
SELECT
  pg_get_functiondef(
    p.oid
  ) AS function_definition
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE p.proname = 'get_learner_journey_days'
  AND n.nspname = 'public';
