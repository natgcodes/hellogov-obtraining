│
◇  Downloading snippet...
-- Query 321 — Inspect Existing Authentication and Trainer Security Functions

SELECT
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n
    ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      'is_trainer',
      'handle_new_user'
  )
ORDER BY p.proname;
