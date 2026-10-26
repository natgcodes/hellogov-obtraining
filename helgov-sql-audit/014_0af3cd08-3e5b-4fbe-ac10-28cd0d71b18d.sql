│
◇  Downloading snippet...
-- Query 335: Inspect get_trainer_learners Function

SELECT
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n
    ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_trainer_learners';
