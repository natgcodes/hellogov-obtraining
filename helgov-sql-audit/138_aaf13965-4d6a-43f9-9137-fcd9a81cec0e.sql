│
◇  Downloading snippet...
-- ============================================================
-- QUERY 191
-- Inspect Quiz Attempts Table
-- READ ONLY
-- ============================================================

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'quiz_attempts'
ORDER BY ordinal_position;
