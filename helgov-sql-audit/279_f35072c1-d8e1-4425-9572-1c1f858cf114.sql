│
◇  Downloading snippet...
-- ============================================================
-- QUERY 71A
-- Inspect Attempt & Result-Reveal Structure
-- ============================================================

select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'quizzes',
    'quiz_attempts'
  )
order by
  table_name,
  ordinal_position;
