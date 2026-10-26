│
◇  Downloading snippet...
-- ============================================================
-- QUERY 194
-- Inspect Quiz Questions Table Structure
-- READ ONLY
-- ============================================================

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'quiz_questions'
ORDER BY ordinal_position;
