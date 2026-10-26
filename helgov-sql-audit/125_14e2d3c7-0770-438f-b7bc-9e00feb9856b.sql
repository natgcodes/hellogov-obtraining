│
◇  Downloading snippet...
-- QUERY 204
-- Review Module Schema & Progress Dependencies
-- READ ONLY

-- 1. MODULE COLUMNS

SELECT
  'MODULE COLUMN' AS category,
  column_name AS name,
  data_type AS details
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'modules'

UNION ALL

-- 2. FUNCTIONS REFERENCING MODULES

SELECT
  'FUNCTION' AS category,
  routine_name AS name,
  specific_name AS details
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_definition ILIKE '%modules%'

ORDER BY category, name;
