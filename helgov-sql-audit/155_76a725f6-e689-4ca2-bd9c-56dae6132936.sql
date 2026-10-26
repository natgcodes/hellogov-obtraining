│
◇  Downloading snippet...
-- ============================================================
-- QUERY 174
-- Inspect Assessment Grading and Reviewer Tracking Structure
-- ============================================================

SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'quiz_attempts',
    'quiz_answers',
    'quiz_questions',
    'quizzes',
    'checkpoints',
    'profiles'
  )
ORDER BY
    table_name,
    ordinal_position;
