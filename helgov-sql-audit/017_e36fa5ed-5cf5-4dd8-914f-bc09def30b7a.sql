│
◇  Downloading snippet...
-- Query 331: Inspect Module Progress Timestamps
-- Read-only diagnostic. Does not modify data.

SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    table_name ILIKE '%progress%'
    OR table_name ILIKE '%module%'
    OR table_name ILIKE '%completion%'
    OR table_name ILIKE '%enrollment%'
  )
ORDER BY
    table_name,
    ordinal_position;
