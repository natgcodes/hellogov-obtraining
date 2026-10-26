│
◇  Downloading snippet...
-- Query 337: Inspect Existing Trainer Progress Functions

SELECT
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n
    ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
    p.proname LIKE '%trainer%learner%'
    OR p.proname LIKE '%trainer%user%'
  )
ORDER BY p.proname;
