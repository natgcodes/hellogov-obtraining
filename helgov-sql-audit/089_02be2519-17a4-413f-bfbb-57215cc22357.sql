│
◇  Downloading snippet...
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    table_name ILIKE '%card%'
    OR table_name ILIKE '%pair%'
  )
ORDER BY
    table_name,
    ordinal_position;
