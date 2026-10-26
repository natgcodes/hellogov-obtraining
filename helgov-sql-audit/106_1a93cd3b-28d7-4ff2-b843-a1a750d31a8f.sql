│
◇  Downloading snippet...
-- QUERY 223
-- Inspect Day Content Structure
-- READ ONLY

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'day_content'
ORDER BY ordinal_position;
