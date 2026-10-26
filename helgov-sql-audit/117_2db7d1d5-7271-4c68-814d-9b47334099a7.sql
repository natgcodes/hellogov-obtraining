│
◇  Downloading snippet...
-- QUERY 212
-- Review Quiz Attempt Security
-- READ ONLY

SELECT
  routine_name AS function_name,
  specific_name,
  routine_definition AS definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND (
    routine_name ILIKE '%quiz%'
    OR routine_name ILIKE '%attempt%'
    OR routine_name ILIKE '%answer%'
    OR routine_name ILIKE '%assessment%'
  )
ORDER BY routine_name;
