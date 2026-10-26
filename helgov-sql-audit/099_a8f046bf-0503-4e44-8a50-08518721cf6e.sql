│
◇  Downloading snippet...
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'quiz_attempts'
ORDER BY ordinal_position;
