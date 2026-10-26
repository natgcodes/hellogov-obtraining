│
◇  Downloading snippet...
-- Query 311 — Inspect User and Enrollment Status Structure

SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
      'profiles',
      'program_enrollments'
  )
ORDER BY
    table_name,
    ordinal_position;
