│
◇  Downloading snippet...
-- QUERY 208
-- Review Progress Mutation Functions
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
    'set_material_complete',
    'set_activity_status'
  )
  AND p.prokind = 'f'
ORDER BY p.proname;
