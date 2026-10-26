│
◇  Downloading snippet...
-- Query 339: Find Functions Depending on get_trainer_learners

SELECT
    n.nspname AS schema_name,
    p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n
    ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname <> 'get_trainer_learners'
  AND pg_get_functiondef(p.oid) ILIKE '%get_trainer_learners%'
ORDER BY p.proname;
