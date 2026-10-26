│
◇  Downloading snippet...
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
      table_name ILIKE '%checkpoint%'
      OR table_name ILIKE '%day%progress%'
  )
ORDER BY table_name, ordinal_position;
