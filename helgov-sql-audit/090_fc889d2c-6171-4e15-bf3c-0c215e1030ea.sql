│
◇  Downloading snippet...
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    table_name ILIKE '%match%'
    OR table_name IN (
      'quiz_questions',
      'quiz_options'
    )
  )
ORDER BY
    table_name,
    ordinal_position;
